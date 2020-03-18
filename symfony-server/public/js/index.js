
$(function () {
  $('select#movieDate').change(function() {
    const date = $(this).val();
    $('table.listings tbody tr').hide();
    $('table.listings tbody tr').has('td:nth-child(1):contains('+date+')').show();
    const dateObj = new Date(date);
    $('span.selectedDate').text(dateObj.toUTCString().substr(0, 16));
    return false;
  });

  $('select#movieDate').change();
});


