<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

define('TEMPLATES_DIR', __DIR__ . '/../../templates');
define('LISTINGS_FILE', __DIR__ . '/../../../getListings/theaterData/listings.json');

class DefaultController extends AbstractController {
  /**
   * @Route("/")
   */
  public function index(Request $request, SessionInterface $session) {

    $movieDate = date('Y-m-d');

    $text = file_get_contents(LISTINGS_FILE);
    $movieData = json_decode($text);

    // drop first (header) line
    array_shift($movieData);

    // convert array of dates to comma separated string:
    foreach ($movieData as &$row) {
      $row[6] = implode(', ', $row[6]);
    }

    $availableDates = array_column($movieData, 0);
    $availableDates = array_unique($availableDates);
    sort($availableDates);
    // remove dates before today
    $availableDates = array_filter(
      $availableDates,
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

