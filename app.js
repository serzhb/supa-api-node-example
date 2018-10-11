// Imports
const request = require('request');
const fs = require('fs');
const https = require('https');

// Constants
const API_KEY = 'YOUR_API_KEY';
const API_URL = 'https://dashboard.supa.ru/api';
const UPLOADER_URL = 'https://uploader.supa.ru';
const OUTPUT_PATH = process.argv[2] || './output.mp4';

// Get source JSON
let source_json = require("./source.json");
let raw_json = JSON.stringify(source_json);

// Replace variables
raw_json = raw_json.replace("%PRICE%", "22990");
raw_json = raw_json.replace("%NAME%", "Apple Watch Series 3");
raw_json = raw_json.replace("%DESC%", "Отслеживайте показатели здоровья. Контролируйте результаты тренировок. Ставьте фитнес-цели и повышайте свою мотивацию. Оставайтесь на связи с близкими.");

// Convert raw JSON to JS Object again
source_json = JSON.parse(raw_json);

// Render request function
let renderRequest = function(callback){
  request(API_URL+"/videos/render?api_key="+API_KEY, {
    method: "POST",
    body: {
      data: source_json,
      params: {}
    },
    json:true
  }, callback);
}

// Function that will wait for render complete
let waitForRender = function(url, callback){
  
  request(url+"?api_key="+API_KEY, {
    method: "GET",
    body: {
      data: source_json,
      params: {}
    },
    json:true
  }, function(err, result){
    if(err) return callback(err);

    if(result.body.state=='queued' || result.body.state=='pending'){
      setTimeout(() => waitForRender(url, callback), 5000);
    }else{
      if(result.body.state == 'error') return callback(new Error("Video render error"));
      if(result.body.state == 'done') return callback(null, result);
    }
  });
}

// Download file
let downloadFile = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}


renderRequest(function(err, request_result){
  if(err) return console.log(err);
  
  waitForRender(request_result.body.task_url, function(err, wait_result){
    if(err) return console.log(err);
    
    downloadFile(wait_result.body.video_url, OUTPUT_PATH, function(err){
      if(err) return console.log(err);
      
      console.log("Video saved in " + OUTPUT_PATH);
    });
  })
});