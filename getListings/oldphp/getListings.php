<?php

namespace WebSight;

require __DIR__ . '/vendor/autoload.php';

define( 'WEBSIGHT_DIR', 'WebSight' );

require_once WEBSIGHT_DIR . '/utilities.php';

define( 'DATA_DIR', __DIR__ . '/data' );

define( 'TYPE_LANDMARK', 1 );
define( 'TYPE_UA', 2 );
define( 'TYPE_RIALTO', 3 );
define( 'TYPE_PFA', 4 );
define( 'TYPE_PARKWAY', 5 );
define( 'TYPE_ROXIE', 6 );
define( 'TYPE_CASTRO', 7 );

define( 'THEATERS', [
  [
    'title' => 'Shattuck Cinemas',
    'url' => 'https://www.landmarktheatres.com/san-francisco-east-bay/shattuck-cinemas',
    'file' => DATA_DIR . '/shattuck.htm',
    'type' => TYPE_LANDMARK
  ],
  [
    'title' => 'Albany Twin',
    'url' => 'https://www.landmarktheatres.com/san-francisco-east-bay/albany-twin',
    'file' => DATA_DIR . '/albany-twin.htm',
    'type' => TYPE_LANDMARK
  ],
  [
    'title' => 'California',
    'url' => 'https://www.landmarktheatres.com/san-francisco-east-bay/california-theatre',
    'file' => DATA_DIR . '/california-theatre.htm',
    'type' => TYPE_LANDMARK
  ],
  [
    'title' => 'Piedmont',
    'url' => 'https://www.landmarktheatres.com/san-francisco-east-bay/piedmont-theatre',
    'file' => DATA_DIR . '/piedmont-theatre.htm',
    'type' => TYPE_LANDMARK
  ],
  [
    'title' => 'Elmwood',
    'url' => 'http://www.rialtocinemas.com/index.php?location=elmwood',
    'file' => DATA_DIR . '/elmwood.htm',
    'type' => TYPE_RIALTO
  ],
  [
    'title' => 'Cerrito',
    'url' => 'http://www.rialtocinemas.com/index.php?location=cerrito',
    'file' => DATA_DIR . '/cerrito.htm',
    'type' => TYPE_RIALTO
  ],
  [
    'title' => 'UA Berkeley',
    'url' => 'https://www.regmovies.com/theaters/ua-berkeley-7/C00893890201',
    'file' => DATA_DIR . '/ua-berkeley.htm',
    'type' => TYPE_UA
  ],
  [
    'title' => 'BAM/PFA',
    'url' => 'https://bampfa.org/visit/calendar',
    'file' => DATA_DIR . '/pfa.htm',
    'type' => TYPE_PFA
  ],
  [
    'title' => 'New Parkway',
    'url' => 'http://www.thenewparkway.com/',
    'file' => DATA_DIR . '/parkway.htm',
    'type' => TYPE_PARKWAY
  ],
  [
    'title' => 'Roxie',
    'url' => 'http://www.roxie.com/calendar/',
    'file' => DATA_DIR . '/roxie.htm',
    'type' => TYPE_ROXIE
  ],
  [
    'title' => 'Castro',
    'url' => 'http://www.castrotheatre.com/p-list.html',
    'file' => DATA_DIR . '/castro.htm',
    'type' => TYPE_CASTRO
  ],
] );

getListings();
exit;


function getListings()
{
  csvRow( [ 'Title', 'Theater', 'Trailer', 'Reviews', 'Synopsis', 'Times' ] );

  $targetDate = date( 'Y-m-d' );
  fwrite( STDERR, "$targetDate\n" );

  foreach (THEATERS as $theater) {
    getTheaterData( $theater, $targetDate );
  }
}


function getTheaterData( $theater, $targetDate )
{
  if (!file_exists( $theater['file'] )) {
    urlToFile( $theater['url'], $theater['file'] );
  }

  \phpQuery::newDocumentFileHTML( $theater['file'] );

  if ($theater['type'] == TYPE_LANDMARK) {
    foreach (pq( '.filmItem' ) as $sresult) {
      $title = trim( pq( '.filmItemTitle', $sresult )->text() );
      $synopsis = trim( pq( '.filmItemSynopsis', $sresult )->text() );
      $trailerLink = '';
      foreach (pq( '.filmItemLinks a', $sresult ) as $el) {
        if (pq( $el )->text() == 'Trailer') {
          $href = pq( $el )->attr( 'href' );
          $trailerLink = a( "href='$href' target=_blank", 'Trailer' );
        }
      }
      $times = [];
      foreach (pq( '.filmItemTimes', $sresult ) as $el) {
        if (pq( $el )->attr( 'data-film-session' ) == $targetDate) {
          foreach (pq( '.filmTimeItem', $el ) as $el2) {
            $times[] = strtotime( pq( $el2 )->text() );
          }
        }
      }

      $href = "http://rottentomatoes.com/search/?search=" . preg_replace( "/'/", '', strtolower( $title ) );
      $rtLink = a( "href='$href' target=_blank", 'Reviews' );

      if ($times) {
        timesToList( $times );
        addRow( $theater, $title, $trailerLink, $rtLink, $synopsis, $times );
      }
    }
  } elseif ($theater['type'] == TYPE_RIALTO) {
    foreach (pq( 'table.features' ) as $sresult) {
      $title = trim( pq( 'td.link h2 a', $sresult )->text() );

      $timesList = trim( pq( 'td.link div:nth-child(6)', $sresult )->text() );
      if ($timesList) {
        $times = preg_split( "/,/", $timesList );
        if ($times) {
          array_walk( $times, function (&$v) { $v = preg_replace( "/[^0-9:]/", '', $v ); } );
          addRow( $theater, $title, '', '', '', $times );
        }
      }
    }
  } elseif ($theater['type'] == TYPE_UA) {
    foreach (pq( '.showtime-panel' ) as $sresult) {
      $title = trim( pq( '.info-cell .title', $sresult )->text() );

      $times = [];
      foreach (pq( '.showtime-entry .btn', $sresult ) as $el) {
        $times[] = strtotime( pq( $el )->text() );
      }

      if ($times) {
        timesToList( $times );
        addRow( $theater, $title, '', '', '', $times );
      }
    }
  } elseif ($theater['type'] == TYPE_PFA) {
    $singleDay = pq( ".single-day[data-date=\"$targetDate\"]" );
    foreach (pq( '.calendar-event', $singleDay ) as $event) {
      if (!preg_match( "/Film/", pq( '.calendar_filter li', $event )->text() )) {
        continue;
      }

      $title = trim( pq( '.title a', $event )->text() );
      $time = pq( '.time', $event )->text();
      $times = [strtotime( $time )];
      timesToList( $times );

      addRow( $theater, $title, '', '', '', $times );
    }
  } elseif ($theater['type'] == TYPE_PARKWAY) {
    foreach (pq( '.eventDay' ) as $eventDay) {
      if (strtotime( pq( '.date a', $eventDay )->text() ) != strtotime( $targetDate )) {
        continue;
      }

      foreach (pq( '.event', $eventDay ) as $event) {
        $time = pq( '.startTime', $event )->text();
        $title = trim( pq( '.summary', $event )->text() );
        if (preg_match( "/(.*)\(purchase tickets online\)/i", $title, $m )) {
          $title = $m[1];
        }

        $times = [strtotime( $time )];
        timesToList( $times );

        addRow( $theater, $title, '', '', '', $times );
      }
    }
  } elseif ($theater['type'] == TYPE_ROXIE) {
    $titles = [];
    $times = [];
    foreach (pq( '.ai1ec-today table.roxie-showtimes-table tr' ) as $row) {
      $title = trim( pq( 'a', $row )->text() );
      if ($title) {
        $titles[] = $title;
      }

      $time = trim( pq( '.now-playing-times-month', $row )->text() );
      $time = preg_replace( "/[^ -~]/", '', $time );
      $time = preg_replace( "/pm/", ' pm', $time );
      $time = preg_replace( "/am/", ' am', $time );
      if ($time) {
        $times[] = $time;
      }
    }

    foreach ($titles as $i => $title) {
      addRow( $theater, $title, '', '', '', [$times[$i]] );
    }
  }
}


function addRow( $theater, $title, $trailerLink, $rtLink, $synopsis, $times )
{
  csvRow(
    [
      strtoupper( $title ),
      a( "href='$theater[url]' target=_blank", $theater['title'] ),
      $trailerLink,
      $rtLink,
      '',//$synopsis,
      implode( ', ', $times ),
    ]
  );
}


function urlToFile( $url, $file )
{
  fwrite( STDERR, "$url\n" );
  $ch = curl_init( $url );
  $fp = fopen( $file, "w" );

  curl_setopt( $ch, CURLOPT_FILE, $fp );
  curl_setopt( $ch, CURLOPT_HEADER, 0 );

  curl_exec( $ch );
  curl_close( $ch );
  fclose( $fp );
}


// times are in secs since epoch
function timesToList( &$times )
{
  sort( $times );
  array_walk( $times, function (&$v) { $v = date( 'g:i a', $v ); } );
}


