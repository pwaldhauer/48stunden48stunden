var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');

var LastFmNode = require('lastfm').LastFmNode;

var config = require(__dirname + '/config');

var lastfm = new LastFmNode({
  api_key: config.key,
  secret: config.secret
});

var db = {'last_check': 0, 'current_time': 0};
if(fs.existsSync(__dirname + '/data.json')) {
  db = require(__dirname + '/data');
}

console.log('Updating data file');
console.log('Last scan: ' + db.last_check);
console.log('Current time: '+ db.current_time + ' seconds');

var total_count = 0;
get_song_count(config.user, config.song_id, db.last_check, 1, function(is_last_page, count) {
  total_count += count;

  if(is_last_page) {
    db.last_check = parseInt((new Date()).getTime() / 1000);
    db.current_time += total_count * config.song_length;
    fs.writeFileSync(__dirname + '/data.json', JSON.stringify(db));
    render_template(db);

    console.log('Done!');
  }
});

function render_template(data) {
  var template = String(fs.readFileSync('template.html'));
  template = template.replace('%time%', parseFloat(data.current_time/3600).toFixed(1));
  template = template.replace('%percent%', (data.current_time/(86400*2)) * 100);

  fs.writeFileSync('index.html', template);
}

function get_song_count(user, song_id, last_check, current_page, cb) {
  lastfm.request('user.getRecentTracks', {
      user: user,
      from: db.last_check,
      page: current_page,
      limit: 200,
      handlers: {
          success: function(data) {
            if(_.isUndefined(data.recenttracks['@attr'])) {
              console.log('Possible error: ', data);
              return cb(true, 0);
            }

            var pages = data.recenttracks['@attr'].totalPages;
            console.log('Current page: %d, pages: %d', current_page, pages);

            var count = 0;
            for(var i in data.recenttracks.track) {
              var track = data.recenttracks.track[i];
              if(track.mbid == song_id) {
                console.log('Gehört um: ' + track.date['#text']);
                count++;
              }
            }

            cb(current_page == pages, count);

            if(current_page != pages) {
              get_song_count(user, song_id, last_check, current_page + 1, cb);
            }
          }
      }
  });
}
