var express = require('express'),
    mastodon = require('./mastodon.js'), // this require() will log an error if you don't have your .env file setup correctly
    storage = require('node-persist'),
    scrapeIt = require("scrape-it"),
    compile = require("string-template/compile");

var app = express();

var archiveTootTemplate = compile('{0} https://www.riddlewot.com/riddles/{1} #riddle');
var frontPageTootTemplate = compile('{0} https://www.riddlewot.com/riddles/{1} https://www.riddlewot.com/ #riddle');

storage.initSync();

app.use(express.static('public')); // serve static files like index.html http://expressjs.com/en/starter/static-files.html

//Check riddlewot for latest, and trim riddle text to 450 chars
function checkRW(response) {
  console.log("Scraping RW");
  scrapeIt("https://www.riddlewot.com/", 
           {fpRiddleText: {
             selector: 'blockquote.nk-blockquote',
             convert: x => {return x.replace('\n','').replace(/\r\n/g,'\n')}
           }, 
            fpRiddleId: {
              selector: 'button.report',
              attr: 'rel'
            }})
    .then(({ data })  => {
      console.log("Scraped response: ");
      console.log(data);
      var lastFpRiddle = storage.getItemSync("fpRiddleId");
      if(data.fpRiddleId === lastFpRiddle){
        findRandomRiddle(response);
      }else{
        var riddleArchive = storage.getItemSync('riddleArchive');
        var newStatus = frontPageTootTemplate( [data.fpRiddleText.substring(-425), data.fpRiddleId]);
        console.log("Trying to toot " + newStatus);
        if(mastodon.tryToToot(newStatus)){ // Some things could prevent us from tooting. Find out more in mastodon.js
          storage.setItemSync("fpRiddleId",data.fpRiddleId);
          storage.setItemSync("fpRiddleText",data.fpRiddleText);
          riddleArchive.push({riddleId: data.fpRiddleId, text: data.fpRiddleText});
          storage.setItemSync('riddleArchive',riddleArchive);
          response.send("Success tooting "+ newStatus +" !");  // We successfully tooted
        } else {
          response.send("Error tooting "+ newStatus +" !");  
        }

      }
    
    }
  );
}

function forceIntoCache(fpRiddleId,fpRiddleText) {
  var riddleArchive = storage.getItemSync('riddleArchive');
    storage.setItemSync("fpRiddleId",fpRiddleId);
    storage.setItemSync("fpRiddleText",fpRiddleText);
  if(riddleArchive.find(riddle => riddle.riddleId === fpRiddleId)){
    var riddle = riddleArchive.find(riddle => riddle.riddleId === fpRiddleId);
    riddle.text = fpRiddleText;
  }else{
    riddleArchive.push({riddleId: fpRiddleId, text: fpRiddleText});
  }
  storage.setItemSync('riddleArchive',riddleArchive);
  
}

function getRiddlesFromList(response) {
    console.log("Scraping RW");
  scrapeIt('https://www.riddlewot.com/riddles',
           {
    riddles: {
      listItem: 'div.riddles',
      name: "riddles",
      data: {
        title: "a",
        riddleId: {
          selector: "a",
          attr: 'href',
          convert: x => { return x.substr(x.lastIndexOf('/') + 1); }
        }
      }
    }
  })
  .then(({data}) => {
      console.log("Scraped riddle List: ");
      for(var i = 0; i < data.riddles.length; i++){
        console.log(data.riddles[i]);
      }
      // for(var i = 0; i < data.length; i++){
      //   refreshCacheForRiddle(data[i]);
      // }
  });
}

function refreshCacheForRiddle(riddleId){
  var riddleArchive = storage.getItemSync('riddleArchive');
  scrapeIt("https://www.riddlewot.com/riddles/"+riddleId, 
       {text: {selector: 'blockquote.nk-blockquote', convert: x => {return x.replace('\n','').replace(/\r\n/g,'\n')} }})
    .then(({ data }) => {
      console.log("Scraped response: ");
      console.log(data);
      var riddleIndex = riddleArchive.findIndex(x => {return x.riddleId === riddleId; });
      if(riddleIndex >= 0){
        riddleArchive[riddleIndex] = {riddleId: riddleId, text: data.text};
      }else{
        riddleArchive.push({riddleId: riddleId, text: data.text});
      }
      storage.setItemSync('riddleArchive',riddleArchive);
      });

}

function findRandomRiddle(response){
  console.log('Picking a random old riddle');
  var useEasyRiddle = !storage.getItemSync('isLastRiddleEasy');
  var riddleArchive = useEasyRiddle ? storage.getItemSync('easyRiddleArchive') : storage.getItemSync('riddleArchive');
  var riddleIndex = Math.floor(Math.random() * (riddleArchive.length)); 
  var riddle = riddleArchive[riddleIndex];
  if(riddle.text == null || riddle.text.endsWith('...') || riddle.text.trim() === ''){ 
    //Text is trimmed by rw or was fetched while the bot was buggy, lets get the full thing and save it in the archive
    // console.log("Trying to reget idx: " + riddleIndex + " riddleId: " + riddle.riddleId + " text: " + riddle.text); 
    scrapeIt("https://www.riddlewot.com/riddles/"+riddle.riddleId, 
           {text: {selector: 'blockquote.nk-blockquote', convert: x => {return x.replace('\n','').replace(/\r\n/g,'\n')} }})
    .then(({ data }) => {
      console.log("Scraped response: ");
      console.log(data);
        var newStatus = archiveTootTemplate( [data.text.substring(-450), riddle.riddleId]);
        console.log("Trying to toot " + newStatus);
        if(mastodon.tryToToot(newStatus)){ // Some things could prevent us from tooting. Find out more in mastodon.js
          riddleArchive[riddleIndex] = {riddleId: riddle.riddleId, text: data.text};
          if(useEasyRiddle){
            storage.setItemSync('easyRiddleArchive',riddleArchive);
          }else{
            storage.setItemSync('riddleArchive',riddleArchive);
          }
          response.send("Success tooting "+ newStatus +" !");  // We successfully tooted
        } else {
          response.send("Error tooting "+ newStatus +" !");  
        }

      }
    
  );
    
  }else{
    var newStatus = archiveTootTemplate( [riddle.text.substring(-450), riddle.riddleId]);

    console.log("Trying to toot " + newStatus);
    if(mastodon.tryToToot(newStatus)){ // Some things could prevent us from tooting. Find out more in mastodon.js
      storage.setItemSync('isLastRiddleEasy',useEasyRiddle);
      response.send("Success tooting "+ newStatus +" !");  // We successfully tooted
    } else {
      response.send("Error tooting "+ newStatus +" !");  // We successfully tooted
    }
  }

}

function cachedToot(){
    var riddleText = storage.getItemSync("fpRiddleId"),
        riddleId = storage.getItemSync("fpRiddleText");
    return archiveTootTemplate([riddleText, riddleId]);
}
 app.get("/clearcache", function(request,response){
     storage.setItemSync("fpRiddleId",0);
     storage.setItemSync("fpRiddleText","");
  //  storage.setItemSync("lastRun",0)
   response.send("cleared FP Cache");
 })
 app.get("/viewcache", function(request,response){
   var riddleArchive = storage.getItemSync('riddleArchive');
   var easyRiddleArchive = storage.getItemSync('easyRiddleArchive');
   
   response.send("Cached Toot: " + cachedToot() + " <br/>Riddle Archive Lenngth: " + riddleArchive.length + "<br/> Easy Archive Length: " + easyRiddleArchive.length);
 })
// app.get("/preload", function (request, response) { // send a GET or POST to /toot to trigger a toot http://expressjs.com/en/starter/basic-routing.html
//   var riddleArchive = require('./riddleList.json');
//   var easyRiddleArchive = require('./easyRiddleList.json');
//   var persistArchive = storage.getItemSync('riddleArchive');
//   var easyPersistArchive = storage.getItemSync('easyRiddleArchive');
//   response.send('You have '+ riddleArchive.length + ' riddles in your json and ' +persistArchive.length+ ' riddles in node-persist.  You also have ' + easyRiddleArchive.length + ' easy riddles in your json and ' + easyPersistArchive.length + ' easy riddles in node-persist' );  
//   if(riddleArchive.length > persistArchive.length){
//     storage.setItemSync('riddleArchive',riddleArchive);
//   }
//   if(easyRiddleArchive.length > easyPersistArchive.length){
//     storage.setItemSync('easyRiddleArchive',easyRiddleArchive);
//   }
  
// });


app.all("/riddle", function (request, response) { 
  var useEasyRiddle = !storage.getItemSync('isLastRiddleEasy');
  var riddleArchive = useEasyRiddle ? storage.getItemSync('easyRiddleArchive') : storage.getItemSync('riddleArchive');
  var riddleIndex = Math.floor(Math.random() * (riddleArchive.length)); 
  var riddle = riddleArchive[riddleIndex];
  if(riddle.text.endsWith('...')){ 
    //Text is trimmed by rw, lets get the full thing and save it in the archive
    scrapeIt("https://www.riddlewot.com/riddles/"+riddle.riddleId, 
           {text: {selector: 'blockquote.nk-blockquote', texteq: 1}})
    .then(({ data }) => {
        var newStatus = archiveTootTemplate( [data.text.substring(-450), riddle.riddleId]);
          riddleArchive[riddleIndex] = {riddleId: riddle.riddleId, text: data.text};
          if(useEasyRiddle){
            storage.setItemSync('easyRiddleArchive',riddleArchive);
          }else{
            storage.setItemSync('riddleArchive',riddleArchive);
          }
          response.send("Random Riddle:"+ newStatus );  // We successfully tooted
      }
    ); 
  }else{
    var newStatus = archiveTootTemplate( [riddle.text.substring(-450), riddle.riddleId]);

  response.send("Random Riddle:"+ newStatus );  // We successfully tooted
  }
});

app.all("/toot", function (request, response) { // send a GET or POST to /toot to trigger a toot http://expressjs.com/en/starter/basic-routing.html
  console.log("Fire toot!");
  //getRiddlesFromList(response);
  //checkRW(response);
  
  findRandomRiddle(response);

  
});

app.all("/allriddles", function (request, response) { // send a GET or POST to /toot to trigger a toot http://expressjs.com/en/starter/basic-routing.html
  response.status(200).json(storage.getItemSync('easyRiddleArchive').concat(storage.getItemSync('riddleArchive')));
});

app.all("/recache/:riddleId", function (request, response) { 
  refreshCacheForRiddle(request.params.riddleId);
});

//    app.all("/oops", function (request, response) { // send a GET or POST to /toot to trigger a toot http://expressjs.com/en/starter/basic-routing.html
//     forceIntoCache('u8ZoEN1Qrj','With feet fixed, I grow in breezy climates and can be seen for miles.  I used to turn to feed you, but now I turn to feed your need for power.');
//       var fpRiddleId = storage.getItemSync('fpRiddleId');
//       var fpRiddleText = storage.getItemSync('fpRiddleText');
  
//       response.send("FP ID: " + fpRiddleId + "<br\\> text: " + fpRiddleText);
  
//    });

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  console.log('Here are some statuses:');
  console.log(cachedToot());
  console.log("✨🔮✨")
});
