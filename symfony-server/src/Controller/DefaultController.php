<?php

namespace App\Controller;

// $t_variable names are for variables going into templates

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

define('TEMPLATES_DIR', __DIR__ . '/../../templates');
define('LISTINGS_FILE', __DIR__ . '/../../../getListings/theaterData/listings.json');
define('THEATER_FILE', __DIR__ . '/../../../getListings/theaterData/theaters.json');

class DefaultController extends AbstractController {
  /**
   * @Route("/")
   */
  public function index(Request $request, SessionInterface $session) {

    $movieDate = date('Y-m-d');

    $t_theaters = json_decode(file_get_contents(THEATER_FILE));

    $t_movieData = json_decode(file_get_contents(LISTINGS_FILE));

    // drop first (header) line
    array_shift($t_movieData);

    // convert array of dates to comma separated string:
    foreach ($t_movieData as &$row) {
      $row[6] = implode(', ', $row[6]);
    }

    $t_availableDates = array_column($t_movieData, 0);
    $t_availableDates = array_unique($t_availableDates);
    sort($t_availableDates);
    // remove dates before today
    $t_availableDates = array_filter(
      $t_availableDates,
      function($v) use ($movieDate) {
        return $v >= $movieDate;
      }
    );

    ob_start();
    include TEMPLATES_DIR . '/index.php';
    $contents = ob_get_clean();

    return new Response(
      $contents
    );
  }
}

