var request = require('request');
var Q = require('q');

var email = "alannodebot-bot@students.hackerschool.com"
var apiKey = "A0LX7Pqn8ukCzvNbDJH8cePLm3JUm1Re"

function Bot(email, apiKey) {
  this.email = email;
  this.apiKey = apiKey;
  this.stream_cbs = [];
  this.private_cbs = [];
};

Bot.prototype.onPrivateMessage = function(cb) {
  this.private_cbs.push(cb);
};

Bot.prototype.onStreamMessage = function(cb) {
  this.stream_cbs.push(cb);
};

Bot.prototype.subscribeToStream = function(stream) {
  // TODO
};

Bot.prototype.sendMessage = function(form) {
  var deferred = Q.defer();

  request.post('https://api.zulip.com/v1/messages', {
    form: form,
    auth: {
      user: this.email, 
      pass: this.apiKey
    },
    json: true
  }, function(error, response, json) {
    if (error) {
      deferred.reject(error);
    }
    else {
      deferred.resolve(json);
    }
  });

  return deferred.promise;
};

/*
* bot.sendStreamMessage : Promise[Json]
*/
Bot.prototype.sendStreamMessage = function(stream, subj, msg) {
  return this.sendMessage({
    to: stream,
    subject: subj,
    content: msg,
    type: 'stream'
  });
};

Bot.prototype.sendPrivateMessage = function(toWhom, msg) {
  return this.sendMessage({
    to: toWhom,
    content: msg,
    type: 'private'
  });
};

Bot.prototype.register = function() {
  var deferred = Q.defer();

  var self = this;
  request.post('https://api.zulip.com/v1/register', {
    auth: {
      user: this.email, 
      pass: this.apiKey
    },
    json: true
  }, function(error, response, json) {
    if (error) {
      deferred.reject(error);
    }
    else {
      deferred.resolve();

      var queue_id = json['queue_id'];
      var last_event_id = json['last_event_id'];

      self.fetchEvents(queue_id, last_event_id);

    }
  });
  return deferred.promise;
};

Bot.prototype.fetchEvents = function(queue_id, last_event_id) {
  var self = this;
  request.get('https://api.zulip.com/v1/events', {
    qs: {
      queue_id: queue_id,
      last_event_id: last_event_id
    },
    auth: {
      user: this.email, 
      pass: this.apiKey
    },
    json: true
  }, function(error, response, json) {
    if (error) {
      this.fetchEvents(queue_id, last_event_id);
    }
    else {
      var events = json['events'];

      // handle them
      console.log();
      console.log("<EVENT LOG>");
      console.log(events);
      console.log("</EVENT LOG>");
      console.log();

      events.forEach(function(e) {
        self.handleEvent(e);
      });

      var new_last_event_id = events.map(function(e) {
        return e["id"];
      }).sort()[events.length - 1];

      self.fetchEvents(queue_id, new_last_event_id);
    }
  });
};

Bot.prototype.handleEvent = function(e) {
  if (e['type'] === 'message') {
    var msg = e['message'];
    if (msg['type'] === 'stream') {
      this.stream_cbs.forEach(function(cb) {
        cb(msg);
      });
    }
    else if (msg['type'] == 'private') {
      this.private_cbs.forEach(function(cb) {
        cb(msg);
      });
    }
  }
};

var bot = new Bot(email, apiKey);

bot.register();

bot.onStreamMessage(function(msg) {
  console.log("Stream message! " + msg);
});

bot.onPrivateMessage(function(msg) {
  console.log("Private message! " + msg);
});
