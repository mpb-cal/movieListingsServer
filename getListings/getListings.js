const path = require('path');
const fs = require('fs');
const async = require('async');
const csv = require('csv-string');
const program = require('commander');
const http = require('http');
const https = require('https');
const pad = require('pad');
const jquery = require('jquery');
const jsdom = require('jsdom');
const moment = require('moment');
const { JSDOM } = jsdom;

program
  .version('0.1.0')
  .option('-f, --force-new-data', 'Ignore cache and download new theater data')
  .parse(process.argv);

if (!program.forceNewData) {
  console.log('Run with -f to ignore cache and download new theater data');
}

const HTML_DIR = path.join(__dirname, 'theaterPages');
const LISTINGS_DIR = path.join(__dirname, 'theaterData');
const LISTINGS_JSON = path.join(LISTINGS_DIR, 'listings.json');
const LISTINGS_CSV = path.join(LISTINGS_DIR, 'listings.csv');

const HEADINGS = [ 'Date', 'Title', 'Theater', 'Trailer', 'Reviews', 'Synopsis', 'Times' ];

const THEATERS = [
  {
    title: 'Shattuck Cinemas',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/shattuck-cinemas',
    filename: `${HTML_DIR}/shattuck.htm`,
    type: THEATER_TYPES.LANDMARK
  },
  {
    title: 'Albany Twin',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/albany-twin',
    filename: `${HTML_DIR}/albany-twin.htm`,
    type: THEATER_TYPES.LANDMARK
  },
  {
    title: 'California',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/california-theatre',
    filename: `${HTML_DIR}/california-theatre.htm`,
    type: THEATER_TYPES.LANDMARK
  },
  {
    title: 'Piedmont',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/piedmont-theatre',
    filename: `${HTML_DIR}/piedmont-theatre.htm`,
    type: THEATER_TYPES.LANDMARK
  },
  {
    title: 'Elmwood',
    url: 'https://www.rialtocinemas.com/index.php?location=elmwood',
    filename: `${HTML_DIR}/elmwood.htm`,
    type: THEATER_TYPES.RIALTO
  },
  {
    title: 'Cerrito',
    url: 'https://www.rialtocinemas.com/index.php?location=cerrito',
    filename: `${HTML_DIR}/cerrito.htm`,
    type: THEATER_TYPES.RIALTO
  },
  {
    title: 'UA Berkeley',
    url: 'https://www.regmovies.com/theatres/regal-ua-berkeley/1172',
    filename: `${HTML_DIR}/ua-berkeley.htm`,
    type: THEATER_TYPES.UA
  },
  {
    title: 'BAM/PFA',
    url: 'https://bampfa.org/visit/calendar',
    filename: `${HTML_DIR}/pfa.htm`,
    type: THEATER_TYPES.PFA
  },
/*  {
    title: 'New Parkway',
    url: 'https://www.thenewparkway.com/',
    filename: `${HTML_DIR}/parkway.htm`,
    type: THEATER_TYPES.PARKWAY
  },
*/  {
    title: 'Roxie',
    url: 'https://www.roxie.com/calendar/',
    filename: `${HTML_DIR}/roxie.htm`,
    type: THEATER_TYPES.ROXIE
  },
  {
    title: 'Castro',
    url: 'http://www.castrotheatre.com/p-list.html',
    filename: `${HTML_DIR}/castro.htm`,
    type: THEATER_TYPES.CASTRO
  }
];

let theaterData = [HEADINGS];

async.each(THEATERS, (item, callback) => getTheaterData(item, program.forceNewData, callback), (err) => {
  if (err) {
    console.error('error: ' + err);
  } else {
    console.log(`Writing JSON file ${LISTINGS_JSON}`);
    fs.writeFile(LISTINGS_JSON, JSON.stringify(theaterData), () => {});
    console.log(`Writing CSV file ${LISTINGS_CSV}`);
    fs.writeFile(LISTINGS_CSV, csv.stringify(theaterData), () => {});
  }
});

const THEATER_TYPES = {
  LANDMARK: 1,
  UA: 2,
  RIALTO: 3,
  PFA: 4,
  PARKWAY: 5,
  ROXIE: 6,
  CASTRO: 7,
};

function getTheaterData(theater, forceDownload, callback) {
  console.log('getTheaterData: ' + theater.title);

  if (!fs.existsSync(theater.filename) || forceDownload) {
    console.log(`Requesting ${theater.url}`);

    let h = (theater.url.match(/^https/) ? https : http);
    h.get(theater.url, function(res) {
      console.log(`Receiving ${theater.url}`);

      if (res.statusCode != 200) {
        res.resume();
        return callback(`${theater.url}: Status Code: ${res.statusCode}`);
      }

      // write the page to a file
      // res is a http.IncomingMessage -> ReadableStream
      // readable.pipe( writeable )
      console.log(`Writing HTML file ${theater.filename}`);
      res.pipe(fs.createWriteStream(theater.filename));
      res.on('end', processTheaterFile(theater, callback));
    });
  } else {
    processTheaterFile(theater, callback);
  }
}

exports.getTheaterData = getTheaterData;

function processTheaterFile(theater, callback) {
  console.log(`Reading HTML file ${theater.filename}`);

  fs.readFile(theater.filename, 'utf8', (err, html) => {
    if (err) {
      return callback(err);
    }

    theaterData = [...theaterData, ...processTheaterHTML(html, theater)];
    callback();
  });
}

function processTheaterHTML(html, theater) {
  const {window} = new JSDOM(html);
  const $ = jquery(window);
  let results = [];
  const theaterLink = `<a href='${theater.url}' target=_blank>${theater.title}</a>`;
  let title = '';
  const TODAY = moment().format().slice(0, 10);
  let showDate = TODAY;
  let trailerLink = '';
  let synopsis = '';

  function addResult(showDate, title, trailerLink, synopsis, times) {
    times.forEach((v,i,a) => {
      if (a[i]) {
        a[i] = a[i].replace(/[^0-9:]/g, '');
        a[i].toUpperCase();
      }
    });

    times = times.filter(e => e);

    const href = "http://rottentomatoes.com/search/?search=" + title.toLowerCase().replace("'", "");
    const rtLink = `<a href='${href}' target=_blank>Reviews</a>`;

    if (times.length) {
      console.log([showDate, title.toUpperCase(), theaterLink, trailerLink, rtLink, synopsis, times]);
      return [showDate, title.toUpperCase(), theaterLink, trailerLink, rtLink, synopsis, times];
    }
  }

  if (theater.type == THEATER_TYPES.LANDMARK) {
    $('.filmItem').each((i,e) => {
      title = $('.filmItemTitle', e).text().trim();
      synopsis = $('.filmItemSynopsis', e).text();

      $('.filmItemLinks a', e).each((i,e) => {
        if ($(e).text() == 'Trailer') {
          const href = $(e).attr('href');
          trailerLink = `<a href='${href}' target=_blank>Trailer</a>`;
        }
      });

      //$(`.filmItemTimes`, e).each( (i,e) => {
      $(`.accordion-item`, e).each((i,e) => {
        showDate = $(e).attr('data-film-session');
        let times = [];
        $('.filmTimeItem', e).each((i,e) => {
          times.push($(e).text().trim());
        });

        let result = addResult(showDate, title, trailerLink, synopsis, times);
        result && results.push(result);
      });
    });
  } else if (theater.type == THEATER_TYPES.RIALTO) {
    $('table.features').each((i,e) => {
      title = $('td.link h2 a', e).text().trim();
      const timesList = $('td.link div:nth-child(6)', e).text().trim();
      if (timesList) {
        const times = timesList.split(',');
        let result = addResult(showDate, title, trailerLink, synopsis, times);
        result && results.push(result);
      }
    });
  } else if (theater.type == THEATER_TYPES.UA) {
    $('.movie-row').each((i,e) => {
      title = $('.qb-movie-name', e).text().trim();

      let times = [];
      $('.qb-movie-info-column a.btn', e).each((i,e) => {
        times.push($(e).text());
      });

      let result = addResult(showDate, title, trailerLink, synopsis, times);
      result && results.push(result);
  });
  } else if (theater.type == THEATER_TYPES.PFA) {
    const singleDay = $(`.single-day[data-date="${TODAY}"]`);
    $('.calendar-event', singleDay).each((i,e) => {
      if (!$('.calendar_filter li', e).text().match(/Film/)) {
        return;
      }

      title = $('.title a', e).text().trim();
      const time = $('.time', e).text();
      const times = [time];

      let result = addResult(showDate, title, trailerLink, synopsis, times);
      result && results.push(result);
  });
  } else if (theater.type == THEATER_TYPES.PARKWAY) {
    showDate = new Date($('#tribe-events-header').attr('data-date')).toISOString().slice(0, 10);

    $('#tribe-events-day').each((i,e) => {
      $('.type-tribe_events', e).each((i,e) => {
        const time = $('.time-details', e).text();
        title = $('.tribe-events-list-event-title', e).text().trim();
        const m = title.match(/(.*)\(purchase tickets online\)/i);
        if (m) {
          title = m[1].trim();
        }

        let result = addResult(showDate, title, trailerLink, synopsis, [time]);
        result && results.push(result);
      });
    });
  } else if (theater.type == THEATER_TYPES.ROXIE) {
    $('.ai1ec-day').each((i,e) => {
      let titles = [];
      let times = [];
      const day = pad(2, $('.ai1ec-date', e).text(), '0');
      showDate = TODAY.replace(/-\d+$/, '-' + day);

      $('table.roxie-showtimes-table tr:even', e).each((i,e) => {
        title = $('a', e).text().trim();
        if (title) {
          titles.push(title);
        }
      });

      $('table.roxie-showtimes-table tr:odd', e).each((i,e) => {
        let time = $('.now-playing-times-month', e).text().trim();
        time = time.replace(/[^ -~]/g, '');
        time = time.replace(/pm/, ' pm');
        time = time.replace(/am/, ' am');
        if (time) {
          times.push(time);
        }
      });

      titles.forEach((v,i) => {
        let result = addResult(showDate, title, trailerLink, synopsis, [times[i]]);
        result && results.push(result);
      });
    });
  }

  return results;
}


