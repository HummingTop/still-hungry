

function getTrackNo(sc_url, season, episode, episode_sub) {

  var endFound = '.json?';
  var startFound = '/tracks/';
  var startIdx = 0;
  var endIndx = 0;
  var foundFlag = false;
  var retTrackNo = -1;

  try {
    
    var result  = request.sync('http://api.soundcloud.com/resolve.json?url='+sc_url+'&client_id=b1da7c7beea77f9989a6a2d73d889307');

    if(result.response.statusCode == 200) {

      startIdx = result.response.request.path.indexOf(startFound);
      endIdx = result.response.request.path.indexOf(endFound);

      // not found
      if(startIdx == -1 
        && endIdx == -1
        && ( sc_url.slice(-'-1'.length) !== '-1' )) {

        return getTrackNo(sc_url + '-1', season, episode, episode_sub);

      } else {

        retTrackNo = result.response.request.path.substring(startIdx + 8, endIdx);  
      }

    } else {

      // not found
      if( sc_url.slice(-'-1'.length) !== '-1' ) {
        return getTrackNo(sc_url + '-1', season, episode, episode_sub);
      }
    }
  } catch (e) {
    // endsWith '-1'
    if(sc_url.indexOf('-1', sc_url.length - '-1'.length) == -1 ) {
      return getTrackNo(sc_url + '-1', season, episode, episode_sub);
    }
  }

  return retTrackNo;
}

// Fixture data 
if (Posts.find().count() === 0) {

  var now = new Date().getTime();
  var rawCSV = Assets.getText('fixture/sheet1.csv');
  var rowsParsed = Baby.parse(rawCSV);
  var rows = rowsParsed.data;

  var adminId = Meteor.users.insert({
    profile: {name: 'youngmin'}
  });

  var admin = Meteor.users.findOne(adminId);

  for(var i=1; i < rows.length; i++ ){

    var element = rows[i];
    var imageUrls = new Array();
    var season = 1;
    var episode = 0;
    var episode_sub = 0;

    // if(element[0] !== 'S02E13') continue;

    // title or telephone is empty 
    if(element[2] == '' || element[5] == '' || element[8] == '') continue;

    var delimiter1 = element[0].indexOf('Ep.');
    var delimiter2 = element[0].indexOf('-');
    var delimiter3 = element[0].indexOf('S02E');
    var delimiter4 = element[0].indexOf(' ');

    // Season 2 
    if (delimiter3 >=0 ) {
      season = 2;
      episode = parseInt(element[0].substring(4));

      sc_url = 'https://soundcloud.com/ddanzi/gg2-' + episode;

    // Season 1
    } else if (delimiter1 >=0 ) {
      season = 1;

      // pilot
      if(delimiter4 >=0) {
        episode=0;
        sc_url = 'https://soundcloud.com/ddanzi/gg-p';
      } else {
        episode = parseInt(element[0].substring(3, 5));
        // sub episode exist
        if(delimiter2 >=0) {
          episode_sub = parseInt(element[0].substring(6, 7));
          sc_url = 'https://soundcloud.com/ddanzi/gg-' + episode + '-' + episode_sub;
        } else {
          sc_url = 'https://soundcloud.com/ddanzi/gg-' + episode;
        }
      }
    }

    var trackNo = getTrackNo(sc_url, season, episode, episode_sub);

    var restaurant = {
      userId: admin._id,
      author: admin.profile.name,
      
      season: season, // season 1,2, ... 
      episode: episode, // episode 1,2, ... 
      episode_sub: episode_sub, // episode ...

      sc_url: sc_url,
      sc_track_no: trackNo,
      sc_time: 0, 

      part: element[1],
      title: element[2],
      dish: element[3],
      // season: element[4],
      location: {
        city: element[5],
        division: element[6],
        address: element[7],
        longtitude: 0,
        latitude: 0
      },
      url: '',
      tel: element[8],
      description: element[9],
      submitted: new Date(now - 7 * 3600 * 1000),
      commentsCount: 0,
      upvoters: [], votes: 0,
      likeusers: [], likes:0
    };

    // fetch value added information from daum API
    // image url, location info
    var requestURI = 'https://apis.daum.net/local/v1/search/keyword.json';
    var query = restaurant.tel? restaurant.tel 
                    : (restaurant.location.city + ' ' + restaurant.location.division + ' ' + restaurant.location.address);

    var result = HTTP.call('GET', requestURI, { params: { apikey: 'f836162338ea24d0e221975199009a2d', query : query } });

    if(result) {
      var object = JSON.parse(result.content);

      if( object.channel.item ) { 
        if (object.channel.item[0] && object.channel.item[0].imageUrl) imageUrls.push(object.channel.item[0].imageUrl);
        restaurant.location.longitude = object.channel.item[0]? object.channel.item[0].longitude: '';
        restaurant.location.latitude = object.channel.item[0]? object.channel.item[0].latitude: '';
      }
    }

    if( restaurant.tel ) {
      var requestURI_Google = 'https://ajax.googleapis.com/ajax/services/search/images';

      var result  = HTTP.call('GET', requestURI_Google, { params: { q: restaurant.tel, v: '1.0'} } );

      if(result.statusCode == 200) {
        var resultArr = JSON.parse(result.content);

        if(resultArr.responseData) {
            for(var j=0; j < resultArr.responseData.results.length; j++ ) {

            var requestImageUrl = resultArr.responseData.results[j].url;
            var imageWidth = parseInt(resultArr.responseData.results[j].width);
            var imageHeight = parseInt(resultArr.responseData.results[j].height);

            // for skipping exception 
            var idxKTO = requestImageUrl.toUpperCase().lastIndexOf('.KTO');
            if(idxKTO > 0 &&  ((idxKTO + 4) !== requestImageUrl.length) ) {
              requestImageUrl = requestImageUrl.substring(0, idxKTO + 4);
            };
            
            var idxJPG = requestImageUrl.toUpperCase().lastIndexOf('.JPG');
            if(idxKTO == -1 && idxJPG > 0 &&  ((idxJPG + 4) !== requestImageUrl.length) ) {
              requestImageUrl = requestImageUrl.substring(0, idxJPG + 4);
            };
            
            var idxPNG = requestImageUrl.toUpperCase().lastIndexOf('.PNG');
            if(idxPNG > 0 && ((idxPNG + 4) !== requestImageUrl.length)) { 
              requestImageUrl = requestImageUrl.substring(0, idxPNG + 4);
            };

            console.log(requestImageUrl);

            if( imageWidth > 450 || imageHeight > 450 ) {

              try {
                var resultImage = HTTP.call('GET', requestImageUrl );
                if(resultImage.statusCode == null) continue;

                if(resultImage.statusCode == 200) {
                  if(imageUrls.length > 10) break;
                  imageUrls.push(requestImageUrl);
                } else {
                  continue;
                }
              }
              catch(err) {
                console.log(err);
                continue;
              }
            

            }
          }
        }
      }
    }

    if (imageUrls.length > 0) restaurant.imageUrl = imageUrls;
    Posts.insert(restaurant);
  }
}