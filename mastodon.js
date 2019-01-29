var storage = require('node-persist'),
    Toot = require('mastodon'),
    Twit = require('twit'),
    toot,
    twit;


storage.initSync();

try {
  toot = new Toot({
    'access_token': process.env.MASTODON_ACCESS_TOKEN,
    'api_url': process.env.MASTODON_API || 'https://mastodon.social/api/v1/'
  });
  console.log("Ready to toot!");
} catch(err) {
  console.error(err);
  console.error("Sorry, your .env file does not have the correct settings in order to toot");
}
try {
  twit = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
  console.log("Ready to tweet!");
} catch(err) {
  // console.error(err);
  console.error("Sorry, your .env file does not have the correct settings in order to tweet");
}

function postToot(status,spoiler_text){
  // if(process.env.ENABLE_TWITTER){
  //   console.log("Tweeting!");
  //   twit.post('statuses/update', { status: status }, function(err, data, response) {
  //     console.log(data);
  //   });
  // }
  if(process.env.ENABLE_MASTODON){
     console.log("Tooting!");
     if(typeof(spoiler_text) != 'undefined' && spoiler_text != null){
       toot.post('statuses', { status: status, spoiler_text: spoiler_text }, function(err, data, response) {
         console.log(`Posted status: ${status}`);
       });
     }else{
       toot.post('statuses', { status: status }, function(err, data, response) {
         console.log(`Posted status: ${status}`);
       });
    }
  }
}

// A few things will prevent a toot from going out:
//  - The correct keys aren't in .env
//  - The status is too long
//  - This bot tweeted less than POST_DELAY_IN_MINUTES minutes ago
module.exports.tryToToot = function(status,spoiler_text){
  console.log("Trying to Toot");
  var now = Date.now(), // time since epoch in millisecond
      lastRun = storage.getItemSync("lastRun") || 0, // last time we were run in milliseconds
      postDelay = process.env.POST_DELAY_IN_MINUTES || 60;// time to delay between tweets in minutes
  
  if (!toot){
    console.error("Sorry, have haven't setup Mastodon yet in your .env")
    return false;
  }
  if (now - lastRun <= (1000 * 60 * postDelay)) { // Only post every process.env.POST_DELAY_IN_MINUTES or 60 minutes
    console.error(`It's too soon, we only post every ${postDelay} minutes. It's only been ${ Math.floor((now - lastRun) / 60 / 1000 ) } minutes`);
    return false;
  }
  if (status.length > 500){
    console.error(`Status too long: ${status}`);
    return false;
  }
    
  storage.setItemSync("lastRun", now);
  postToot(status);
  return true;
}