// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var route_service = require('./Routes_service');
var spellService = require('./spell-service');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('SearchHotels', [
    function (session, args, next) {
        session.send('Welcome to the Hotels finder! We are analyzing your message: \'%s\'', session.message.text);

        // try extracting entities
        var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
        var airportEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'AirportCode');
        if (cityEntity) {
            // city entity detected, continue to next step
            session.dialogData.searchType = 'city';
            next({ response: cityEntity.entity });
        } else if (airportEntity) {
            // airport entity detected, continue to next step
            session.dialogData.searchType = 'airport';
            next({ response: airportEntity.entity });
        } else {
            // no entities detected, ask user for a destination
            builder.Prompts.text(session, 'Please enter your destination');
        }
    },
    function (session, results) {
        var destination = results.response;
        console.log(JSON.stringify(destination));
        var message = 'Looking for hotels';
        if (session.dialogData.searchType === 'airport') {
            message += ' near %s airport...';
        } else {
            message += ' in %s...';
        }

        session.send(message, destination);

        // Async search
        Store
            .searchHotels(destination)
            .then(function (hotels) {
                // args
                session.send('I found %d hotels:', hotels.length);

                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.list)
                    .attachments(hotels.map(hotelAsAttachment));

                session.send(message);

                // End
                session.endDialog();
            });
    }
]).triggerAction({
    matches: 'SearchHotels',
    onInterrupted: function (session) {
        session.send('Please provide a destination');
    }
});

bot.dialog('ShowHotelsReviews', function (session, args) {
    // retrieve hotel name from matched entities
    console.log(args.intent.entities);
    var hotelEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Hotel');
    if (hotelEntity) {
        session.send('Looking for reviews of \'%s\'...', hotelEntity.entity);
        Store.searchHotelReviews(hotelEntity.entity)
            .then(function (reviews) {
                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(reviews.map(reviewAsAttachment));
                session.endDialog(message);
            });
    }
}).triggerAction({
    matches: 'ShowHotelsReviews'
});

bot.dialog('hi',[
    function (session, args, next) {
        builder.Prompts.text(session, "My name is KARL v1.0. I was born in Jakarta office at BIMA-2 room. My creator is Ken, Rinaldi, Suwa and Herdi. I was build to manage your inquiry. What can I help you?");
    },function(session, result){
        builder.Prompts.text(session, "What package do you want to send?");
    },function(session, result){
        builder.Prompts.text(session,"Please tell me your departure and destination coordinate");
    }
]).triggerAction({
    matches: 'hi'
});;

bot.dialog('defineFrom', [
    function (session, args, next) {
        console.log("aaa"+JSON.stringify(session.userData));
        if(session.userData.from){
            builder.Prompts.text(session, "Where do you want to send your package?");
        }else{
            builder.Prompts.text(session, "From which location do ypu want to send your package?");
        }
    },
    function (session, results){
        ///console.log("true:"+JSON.stringify(session.userData));
        
        var to = ""; 
        var from = ""; 

        if(session.userData.from){
            to = results.response;
            from = session.userData.from;
        }else{
            to = session.userData.to;
            from = results.response;
        }

        route_service.getShortestPath(from, to, function(q){
            if(q){
                //console.log("aa: "+JSON.stringify(q));
                var message = new builder.Message()
                .attachmentLayout(builder.AttachmentLayout.list)
                .attachments(q.map(routes));
    
                session.send("Below is best route from: "+from +" - "+ "to: "+to+" ");
                session.endDialog(message);
            }else{
                session.endDialog("No route found");
            }
        });
    }
]);

bot.dialog('deliverPackage', [
    function (session, args, next) {
        console.log(JSON.stringify(args.intent.entities));
        var from = builder.EntityRecognizer.findEntity(args.intent.entities, 'from');
        var to = builder.EntityRecognizer.findEntity(args.intent.entities, 'to');
        if(from && !to){
            console.log("1");
            session.userData.from = from.entity;
            session.userData.to = null;
            session.beginDialog('defineFrom', session.userData.from);
            //next({from: from.entity});
        }else if(to && !from){
            console.log("2");
            session.userData.to = to.entity;
            session.userData.from = null;
            session.beginDialog('defineFrom', session.userData.to);
            //next({to: to.entity});
        }else if(to && from){
            console.log("3");
            route_service.getShortestPath(from.entity, to.entity, function(q){
                if(q){
                    //console.log("aa: "+JSON.stringify(q));
                    var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.list)
                    .attachments(q.map(routes));
        
                    //session.send("Below is possible route(s) from: "+from.entity +" - "+ "to: "+to.entity +" ");
                    session.endDialog(message);
                }else{
                    session.endDialog("No route found");
                }
            });
        }else{
            console.log("4");
            next({data: ""});
        }
    },function(session, result){
        session.send("This is your order summary:");
        session.send("Package: Car, Departure coordinate: 609, Destination coordinate: 411");
        session.endDialog("Tracking ID: TR-123256");
    }
]
).triggerAction({
    matches: 'deliverPackage'
});

bot.dialog('Help', function (session) {
    session.endDialog('Hi! Try asking me things like \'search hotels in Seattle\', \'search hotels near LAX airport\' or \'show me the reviews of The Bot Resort\'');
}).triggerAction({
    matches: 'Help'
});


// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: function (session, next) {
            spellService
                .getCorrectedText(session.message.text)
                .then(function (text) {
                    session.message.text = text;
                    next();
                })
                .catch(function (error) {
                    console.error(error);
                    next();
                });
        }
    });
}

// Helpers
function hotelAsAttachment(hotel) {
    return new builder.HeroCard()
        .title(hotel.name)
        .subtitle('%d stars. %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting)
        .images([new builder.CardImage().url(hotel.image)])
        .buttons([
            new builder.CardAction()
                .title('More details')
                .type('openUrl')
                .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location))
        ]);
}

function reviewAsAttachment(review) {
    return new builder.ThumbnailCard()
        .title(review.title)
        .text(review.text)
        .images([new builder.CardImage().url(review.image)]);
}

function routes(data) {
    return new builder.HeroCard()
        .title(data.title)
        .text(JSON.stringify("routes: "+data.lane +" with time: "+data.cost +" minutes"))
        .images([new builder.CardImage().url(data.image)]);
}