<?php

//namespace WebSight;

require __DIR__ . '/vendor/autoload.php';
//require __DIR__ . '/vendor/mpb-cal/web-sight/WebPage.php';


$wp = new WebSight\WebPage;

pnl( 'hello' );

pnl( $wp->getOutput() );

?>
