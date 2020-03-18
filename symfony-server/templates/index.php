<?php

namespace WebSight;

require_once __DIR__ . '/../vendor/mpb-cal/web-sight/WebPage.php';

define('HEADS', ['Date', 'Title', 'Theater', '', '', 'Synopsis', 'Times']);

$mainContent =
  div( "class='container-fluid'",
    div( "class=row",
      div( "class=col-sm-12",
        h1( '', 'East Bay Movie Listings' )
        . h2( '', '(note: most theaters are currently closed due to COVID-19)' )
        . form( "class=form-inline method='post'",
          div( 'class=form-group',
            label( "for='movieDate'", "Select A Date: " )
            . select( "class=form-control name='movieDate' id='movieDate'",
              array_reduce($availableDates, function($c, $i) {return $c . option('', $i); })
            )
          )
        )
        . h2( '',
          'Showtimes for '
          . span( 'class=selectedDate' )
        )
        . table( 'class="table table-bordered compact table-condensed order-column websightDatatable listings"',
          thead( '',
            tr( '',
              array_reduce(HEADS, function($c, $i) {return $c . th('', $i); })
            )
          )
          . tfoot( '',
            tr( '',
              array_reduce(HEADS, function($c, $i) {return $c . th('', $i); })
            )
          )
          . tbody( '',
            array_reduce(
              $movieData, 
              function($c, $row) {
                return $c . tr('', array_reduce(
                  $row,
                  function($c, $cell) {
                    return $c . td('', $cell);
                  }
                ));
              }
            )
          )
        )
      )
    )
  )
;

$head = head( '',
  title( '', 'East Bay Movie Listings' )
  . meta( 'http-equiv="cache-control" content="no-cache"' )
  . meta( 'http-equiv="expires" content="0"' )
  . meta( 'http-equiv="pragma" content="no-cache"' )
  . meta( 'charset="utf-8"' )
  . meta( 'http-equiv="x-ua-compatible" content="ie=edge"' )
  . meta( 'name="description" content=""' )
  . meta( 'name="viewport" content="width=device-width, initial-scale=1"' )
  . script( 'src="https://use.fontawesome.com/2d54cb1cdd.js"' )
  . link_( 'rel="stylesheet" href="css/normalize.min.css" type="text/css" media="all"' )
  . link_( 'rel="stylesheet" href="css/boilerplate-main.css" type="text/css" media="all"' )
  . link_( 'rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" type="text/css" media="all"' )
  . link_( 'rel="stylesheet" href="https://cdn.datatables.net/v/bs/dt-1.10.12/datatables.min.css" type="text/css" media="all"' )
  . link_( 'rel="stylesheet" href="css/mpb.css" type="text/css" media="all"' )
  . link_( 'rel="stylesheet" href="css/listings.css" type="text/css" media="all"' )
);

$body = body( '',
  $mainContent
  . script( 'src="https://code.jquery.com/jquery-1.12.0.min.js"' )
  . script( 'src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"' )
  . script( 'src="https://cdn.datatables.net/v/bs/dt-1.10.12/datatables.min.js"' )
  . script( 'src="js/index.js"' )
  . script( '',
    'jQuery(function($) {
        $("table.websightDatatable").dataTable( {
          searching: false,
          stateSave: true,
          paging: false,
          info: false
        } );
    });'
  )
);

print '<!DOCTYPE html>
'
. html( '',
  $head
  . $body
);
?>
