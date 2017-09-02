$(document).ready(function() {
  $(".js-select").select2();

  $('#source_countries_list').select2({
    placeholder: "Country",
    allowClear: true
  });

  $('#source_cities_list').select2({
    placeholder: "City",
    allowClear: true,
    disabled: true
  });

  $('#source_airports_list').select2({
    placeholder: "Airport",
    allowClear: true,
    disabled: true
  });

  $('#dest_countries_list').select2({
    placeholder: "Country",
    allowClear: true
  });

  $('#dest_cities_list').select2({
    placeholder: "City",
    allowClear: true,
    disabled: true
  });

  $('#source_airports_list').select2({
    placeholder: "Airport",
    allowClear: true,
    disabled: true
  });

  $('#dest_airports_list').select2({
    placeholder: "Airport",
    allowClear: true,
    disabled: true
  })

  $('#users_list').select2({
    placeholder: "Search Users"
  });

  $('#register_link > a').tooltip({
    title: 'Register to permanently store and share trips',
    placement: 'bottom'
  });

  $('#saved_trips_link > a').tooltip({
    title: 'Click on routes to save trips',
    placement: 'bottom'
  });

  $('#search_flights_button > button').tooltip({
    title: 'Only a source or destination country are required - all other fields can be used to filter',
    placement: 'bottom'
  });

  $('#source_countries_list').change(function() {
    var country_id = $(this).val();
    var city_list = $('#source_cities_list')
    var airports_list = $('#source_airports_list')
    airports_list.prop('disabled', true);
    airports_list.empty();
    city_list.empty();
    if (country_id != '' && country_id != 'int') {
      Pace.restart();
      $('#international_dest').remove();
      $('#dest_countries_list').prepend($("<option id='international_dest' value='int'>INTERNATIONAL</option>"))
      city_list.prop('disabled', false);
      city_list.append($("<option></option>").attr("value", '').text('Select City'));
      $.ajax({
      	type: 'get',
      	url: '/list/' + country_id + '/cities_list',
      	success: function(json){
          var cities = $.parseJSON(json)
          $.each(cities, function(i, city) {
            city_list.append($("<option></option>").attr("value", city.id).text(city.name));
          });
          Pace.stop();
        }
      });
    } else {
      $('#international_dest').remove();
      city_list.prop('disabled', true);
    };
  });

  $('#dest_countries_list').change(function() {
    var country_id = $(this).val();
    var city_list = $('#dest_cities_list')
    var airports_list = $('#dest_airports_list')
    airports_list.prop('disabled', true);
    airports_list.empty();
    city_list.empty();
    if (country_id != '' && country_id != 'int') {
      Pace.restart();
      $('#international_source').remove();
      $('#source_countries_list').prepend(("<option id='international_source' value='int'>INTERNATIONAL</option>"))
      city_list.prop('disabled', false);
      city_list.append($("<option></option>").attr("value", '').text('Select City'));
      $.ajax({
      	type: 'get',
      	url: '/list/' + country_id + '/cities_list',
      	success: function(json){
          var cities = $.parseJSON(json)
          $.each(cities, function(i, city) {
            city_list.append($("<option></option>").attr("value", city.id).text(city.name));
          });
          Pace.stop();
        }
      });
    } else {
      $('#international_source').remove();
      city_list.prop('disabled', true);
    };
  });

  $('#source_cities_list').change(function() {
    var city_id = $(this).val();
    var airport_list = $('#source_airports_list');
    airport_list.empty();
    if (city_id != '') {
      Pace.restart();
      airport_list.prop('disabled', false);
      airport_list.append($("<option></option>").attr("value", '').text('Select Airport'));
      $.ajax({
      	type: 'get',
      	url: '/list/' + city_id + '/airports_list',
      	success: function(json){
          var airports = $.parseJSON(json)
          $.each(airports, function(i, airport) {
            airport_list.append($("<option></option>").attr("value", airport.id).text(airport.name));
          });
          Pace.stop();
        }, error: function(jqXHR, textStatus, errorThrown) {
          var error_message = "<p class='error'>Internal Server Error</p>"
          var message = $('#message')
          message.html(error_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        }
    	});
    } else {
      airport_list.prop('disabled', true)
    }
  });

  $('#dest_cities_list').change(function() {
    var city_id = $(this).val();
    var airport_list = $('#dest_airports_list');
    airport_list.empty();
    if (city_id != '') {
      Pace.restart();
      airport_list.prop('disabled', false);
      airport_list.append($("<option></option>").attr("value", '').text('Select Airport'));
      $.ajax({
        type: 'get',
        url: '/list/' + city_id + '/airports_list',
        success: function(json){
          var airports = $.parseJSON(json)
          $.each(airports, function(i, airport) {
            airport_list.append($("<option></option>").attr("value", airport.id).text(airport.name));
          });
          Pace.stop();
        }, error: function(jqXHR, textStatus, errorThrown) {
          var error_message = "<p class='error'>Internal Server Error</p>"
          var message = $('#message')
          message.html(error_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        }
      });
    } else {
      airport_list.prop('disabled', true)
    }
  });

  $('#signin_form').on('submit', function(e) {
    Pace.restart();
    e.preventDefault();
    var user_name = $('#signin_user_name').val();
    var password = $('#signin_password').val();
    var request = $.ajax({
      type: 'post',
      url: '/sign_in',
      dataType: 'json',
      data: {
        user_name: user_name,
        password: password,
      },
      success: (function(data, textStatus, jqXHR) {
        if (data.status == 'success') {
          $('#signin_modal').modal('hide');
          $('#signin_link').css('display','none');
          $('#register_link').css('display','none');
          $('#share_trips_link').css('display','');
          $('#user_link').text(data.content.link);
          $('#user_info').css('display','');
          $('#user_info > p > em').text('Signed in as ' + data.content.user_name);
          $('#sign_out_link').css('display','');
          var success_message = "<p class='success'>Welcome " + data.content.user_name + "</p>"
          var message = $('#message');
          message.html(success_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        } else if (data.status == 'error') {
          var error_message = "<p class='error'>" + data.content + "</p>"
          var message = $('#message');
          message.html(error_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        }
      }), error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    });
  })

  $('#register_form').on('submit', function(e) {
    Pace.restart();
    e.preventDefault();
    var user_name = $('#register_user_name').val();
    var password = $('#register_password').val();
    request = $.ajax({
      type: 'post',
      url: '/register',
      dataType: 'json',
      data: {
        user_name: user_name,
        password: password,
      },
      success: (function(data, textStatus, jqXHR) {
        if (data.status == 'success') {
          $('#register_modal').modal('hide');
          $('#signin_link').css('display','none');
          $('#register_link').css('display','none');
          $('#user_info').css('display','');
          $('#user_info > p > em').text('Signed in as ' + data.content.user_name);
          $('#share_trips_link').css('display','');
          $('#user_link').text(data.content.link);
          $('#sign_out_link').css('display','');
          var success_message = "<p class='success'>Welcome " + data.content.user_name + "</p>"
          var message = $('#message');
          message.html(success_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        } else if (data.status == 'error') {
          var error_message = "<p class='error'>" + data.content + "</p>"
          var message = $('#message');
          message.html(error_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        }
      }), error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    });
  });

  $('#sign_out_link').on('click', function(e) {
    e.preventDefault();
    Pace.restart();
    $.ajax({
      type: 'post',
      url: '/sign_out',
      success: function(data, textStatus, jqXHR) {
        removePolylines();
        $('#user_info').css('display','none');
        $('#sign_out_link').css('display','none');
        $('#signin_link').css('display','');
        $('#register_link').css('display','');
        $('#share_trips_link').css('display','none');
        var success_message = "<p class='success'>Successfully signed out</p>"
        var message = $('#message');
        message.html(success_message);
        message.children("p").fadeOut(8000);
        $.ajax({
          type: 'get',
          url: '/all_user_trips',
          success: function(data, textStatus, jqXHR) {
            var desc = 'searched_routes';
            drawMapData(data, desc);
          }, error: function(jqXHR, textStatus, errorThrown) {
            var error_message = "<p class='error'>Internal Server Error</p>"
            var message = $('#message')
            message.html(error_message);
            message.children("p").fadeOut(8000);
            Pace.stop();
          }
        });
      }, error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    });
    // Pace.stop();
  })


  $('#search_form').on('submit', function(e) {
    e.preventDefault();
    Pace.restart();
    var source_country_id = $('#source_countries_list').val()
    var source_city_id = $('#source_cities_list').val()
    var source_airport_id = $('#source_airports_list').val()
    var dest_country_id = $('#dest_countries_list').val()
    var dest_city_id = $('#dest_cities_list').val()
    var dest_airport_id = $('#dest_airports_list').val()
    var query = 'source_country=' + source_country_id + '&source_city=' + source_city_id +
                '&source_airport=' + source_airport_id + '&dest_country=' + dest_country_id +
                '&dest_city=' + dest_city_id + '&dest_airport=' + dest_airport_id
    $.ajax({
      type: 'get',
      url: '/searched_routes?' + query,
      dataType: 'json',
      success: function(data, textStatus, jqXHR) {
        if (data.status == 'success') {
          removePolylines();
          var desc = 'searched_routes';
          drawMapData(data.content, desc);
          $('#new_search_modal').modal('hide');
          Pace.stop();
        } else {
          var error_message = "<p class='error'>" + data.content + "</p>"
          var message = $('#message');
          message.html(error_message);
          message.children("p").fadeOut(15000);
          Pace.stop();
        }
      }, error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    });
    // Pace.stop();
  })

  $('#saved_trips_link').on('click', function(e) {
    e.preventDefault();
    Pace.restart();
    $.ajax({
      type: 'get',
      url: '/saved_trips',
      dataType: 'json',
      success: function(data, textStatus, jqXHR) {
        if (data.status == 'error') {
          var error_message = "<p class='error'>" + data.content + "</p>"
          var message = $('#message')
          message.html(error_message);
          message.children("p").fadeOut(8000);
          Pace.stop();
        } else if (data.status == 'success') {
          removePolylines();
          desc = "saved_routes"
          drawMapData(data.content, desc);
          Pace.stop();
        }
      }, error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    });
    // Pace.stop();
  })

  $('#search_users_form').on('submit', function(e) {
    e.preventDefault();
    Pace.restart();
    removePolylines();
    var user_info = $('#users_list').val();
    request = $.ajax({
      url: '/user_trips',
      type: 'get',
      data: { user_info: user_info },
      success: function(data, textStatus, jqXHR) {
        var desc = 'searched_routes';
        drawMapData(data, desc);
        Pace.stop();
      }, error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Internal Server Error</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        Pace.stop();
      }
    })
    // Pace.stop();
  })
});

var polylines = [];
function removePolylines() {
  for (var i = 0; i < polylines.length; i++) {
    polylines[i].setMap(null);
  }
  polylines = []
}

function drawMapData(data, purpose) {
  var routes_result = $.parseJSON(data)
  var mdata = routes_result.mdata;
  var map_title = routes_result.map_title;
  $('strong#result_title').text(map_title);
  $('em#route_count').text('Routes: ' + mdata.route_count);
  $('em#country_count').text('Countries: ' + mdata.country_count);
  $('em#city_count').text('Cities: ' + mdata.city_count);
  $('em#total_distance').text('Distance: ' + mdata.total_distance);
  var routes = routes_result.routes;
  var line_weight_untouched = 1;
  var line_weight_touched = 8;
  var opacity_untouched;
  if (mdata.route_count > 120) {
    opacity_untouched = 1 / (Math.log2(mdata.route_count/50));
  } else if (mdata.route_count > 40) {
    opacity_untouched = 1 - (mdata.route_count / 600)
  } else {
    opacity_untouched = 1
  }
  var opacity_touched = 0.99;
  $.each(routes, function(i, route) {
    var source_coordinates = route.source_coordinates
    var source_airport_name = route.source_airport_name
    var source_city = route.source_city_name
    var source_country = route.source_country_name
    var dest_coordinates = route.dest_coordinates
    var dest_airport_name = route.dest_airport_name
    var dest_city = route.dest_city_name
    var dest_country = route.dest_country_name
    var route_id = route.route_id
    var distance = route.distance

    var path_coordinates = [{lat: source_coordinates[0], lng: source_coordinates[1]},
                            {lat: dest_coordinates[0], lng: dest_coordinates[1]}]

    var infowincontent = document.createElement('div');
    var airports_name_p = document.createElement('p');
    var locations_name_p = document.createElement('p');
    var distance_p = document.createElement('p');

    var airports_name_text = document.createElement('strong');
    airports_name_text.textContent = source_airport_name + ' -> ' + dest_airport_name
    airports_name_p.appendChild(airports_name_text);
    infowincontent.appendChild(airports_name_p);

    locations_name_p.textContent = source_city + ', ' + source_country + ' -> ' +
                                      dest_city + ', ' + dest_country
    infowincontent.appendChild(locations_name_p);

    var distance_text = document.createElement('em');
    distance_text.textContent = distance + ' miles'
    distance_p.appendChild(distance_text);
    infowincontent.appendChild(distance_p);

    var flight_path = new google.maps.Polyline({
      path: path_coordinates,
      geodesic: true,
      strokeColor: '#84ffc1',
      strokeWeight: line_weight_untouched,
      strokeOpacity: opacity_untouched
    });
    flight_path.setMap(map);
    polylines.push(flight_path);

    if (mdata.route_count > 300) {
      polylines.push(flight_path);
      var error_message = "<p class='error'>Narrow your search to under 300 results if you'd like to click and save routes</p>"
      var message = $('#message');
      message.html(error_message);
      message.children("p").fadeOut(20000);
    } else {
      flight_path.addListener('mouseover',function() {
        infoWindow.setContent(infowincontent);
        infoWindow.setPosition(path_coordinates[1]);
        infoWindow.open(map, flight_path);
        flight_path.setOptions({
          strokeColor: '#E7Ef0E',
          strokeWeight: line_weight_touched,
          strokeOpacity: opacity_touched
        });
      });

      flight_path.addListener('mouseout', function() {
        infoWindow.close();
        flight_path.setOptions({
          strokeWeight: line_weight_untouched,
          strokeColor: '#84ffc1',
          strokeOpacity: opacity_untouched
        });
      });

      flight_path.addListener('mouseout', function() {
        infoWindow.close();
        flight_path.setOptions({
          strokeWeight: line_weight_untouched,
          strokeColor: '#84ffc1',
          strokeOpacity: opacity_untouched
        });
      });

      flight_path.addListener('click', function() {
        if (purpose == 'searched_routes') {
          var form = "<form action='/save_trip' method='post' id='save_trips_form'>\
                        <h3></h3>\
                        <button type='submit' class='btn btn-default' id='save_trips_button' value='save'>Save</button>\
                        <button type='submit' class='btn btn-default' id='cancel_save_trips_button' value='cancel'>Cancel</button>\
                      </form>"
          $('#save_trips_modal_body').append(form);
          var header = $('#save_trips_form > h3')
          header_text = 'Would you like to save this trip from ' +
                        source_city + ' to ' + dest_city + '?'
          header.text(header_text);
          $('#save_trips_modal').modal('show');
          $('#save_trips_modal').on('hide.bs.modal', function() {
            $('#save_trips_form').remove();
          });
          $('#save_trips_form > button').click(function(e) {
            e.preventDefault();
            var button_val = $(this).attr('value');
            if (button_val == 'save') {
              $.ajax({
                type: 'post',
                url: '/save_trip',
                dataType: 'json',
                data: { route_id: route_id },
                success: function(data, textStatus, jqXHR) {
                if (data.status == 'success') {
                  var success_message = "<p class='success'>" + data.content + "</p>"
                  var message = $('#message')
                  message.html(success_message)
                  message.children("p").fadeOut(8000)
                } else if (data.status == 'error') {
                  var error_message = "<p class='error'>" + data.content + "</p>"
                  var message = $('#message');
                  message.html(error_message);
                  message.children("p").fadeOut(8000);
                }
              }, error: function(jqXHR, textStatus, errorThrown) {
                var error_message = "<p class='error'>Internal Server Error</p>"
                var message = $('#message')
                message.html(error_message);
                message.children("p").fadeOut(8000);
              }
              });
            };
            $('#save_trips_modal').modal('hide');
          })
        } else if (purpose == 'saved_routes') {
         var form = "<form action='/delete_trip' method='post' id='delete_trips_form'>\
                        <h3></h3>\
                        <button type='submit' class='btn btn-default' id='delete_trips_button' value='delete'>Delete</button>\
                        <button type='submit' class='btn btn-default' id='cancel_delete_trips_button' value='cancel'>Cancel</button>\
                      </form>"
          $('#delete_trips_modal_body').append(form);
          var header = $('#delete_trips_form > h3')
          header_text = 'Would you like to delete this trip from ' +
                        source_city + ' to ' + dest_city + '?'
          header.text(header_text);
          $('#delete_trips_modal').modal('show');
          $('#delete_trips_modal').on('hide.bs.modal', function() {
            $('#delete_trips_form').remove();
          })
          $('#delete_trips_form > button').click(function(e) {
            e.preventDefault();
            var button_val = $(this).attr('value');
            if (button_val == 'delete') {
              $.ajax({
                type: 'post',
                url: '/delete_trip',
                data: {
                  route_id: route_id
              }, dataType: 'json',
              success: function(data, textStatus, jqXHR) {
                if (data.status == 'success') {
                  flight_path.setMap(null);
                  var success_message = "<p class='success'>" + data.content + "</p>"
                  var message = $('#message')
                  message.html(success_message)
                  message.children("p").fadeOut(8000)
                }
              }, error: function(jqXHR, textStatus, errorThrown) {
                var error_message = "<p class='error'>Internal Server Error</p>"
                var message = $('#message')
                message.html(error_message);
                message.children("p").fadeOut(8000);
              }
              });
            };
            $('#delete_trips_modal').modal('hide');
            $('#delete_trips_form').remove();
          });
        }
      });
    }
  });
};

var map;
var infoWindow;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 0, lng: 0},
    zoom: 2,
    styles: [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#8ec3b9"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1a3646"
        }
      ]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#64779e"
        }
      ]
    },
    {
      "featureType": "administrative.province",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#334e87"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#6f9ba5"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "poi.business",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#3C7680"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#304a7d"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#98a5be"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#2c6675"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#255763"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#b0d5ce"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "road.local",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#98a5be"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#3a4762"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#0e1626"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#4e6d70"
        }
      ]
    }
  ]
  });
  infoWindow = new google.maps.InfoWindow;
  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  var user_info = getParameterByName('user');

  if (user_info) {
    $.ajax({
      url: '/user_trips',
      type: 'get',
      data: { user_info: user_info },
      success: function(data, textStatus, jqXHR) {
        var desc = 'searched_routes';
        drawMapData(data, desc);
      }, error: function(jqXHR, textStatus, errorThrown) {
        var error_message = "<p class='error'>Invalid User Parameters</p>"
        var message = $('#message')
        message.html(error_message);
        message.children("p").fadeOut(8000);
        $.ajax({
          type: 'get',
          url: '/all_user_trips',
          success: function(data, textStatus, jqXHR) {
            var desc = 'searched_routes';
            drawMapData(data, desc);
          }
        });
      }
    })
  } else {
    $.ajax({
      type: 'get',
      url: '/all_user_trips',
      success: function(data, textStatus, jqXHR) {
        var desc = 'searched_routes';
        drawMapData(data, desc);
      }
    });
  }
};
