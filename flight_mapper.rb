require 'sinatra'
require 'json'
require 'bcrypt'
require 'uri'

# AIzaSyAnd4doUAnl3kckBE8CBzGv3sx_rdB1qo8
working_dir = File.dirname(__FILE__)

require_relative "#{working_dir}/data/flight_db"

configure do
  enable :sessions
  set :session_secret, 'secret'
  set :sessions, expire_after: 86_400
  set :erb, escape_html: true
end

configure(:development) do
  require 'sinatra/reloader'
  require 'pry'
  also_reload "#{working_dir}/data/flight_db.rb"
end

before do
  @database = FlightDB.new(logger)
  session[:user_id] ||= @database.create_temp_user
end

helpers do
  def create_user_link
    host = env['HTTP_HOST']
    URI.escape("http://#{host}/?user=#{session[:user_id]};#{session[:user_name]}")
  end

  def signed_in?
    session[:user_name]
  end
end

get '/' do
  @users = @database.all_users
  @countries = @database.all_countries
  erb :home, layout: :layout
end

get '/all_user_trips' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  routes_hash = @database.all_user_trips
  routes_hash[:map_title] = 'All Recently Added Trips'
  routes_hash.to_json
end

def invalid_user_info(user_id, user_name)
  return true unless user_id || user_name
  user_info = @database.find_user_info(user_name)
  user_info.nil? || (user_info[:id] != user_id)
end

get '/user_trips' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'

  params_match = /^(\d+);(.+)$/.match(params['user_info'])
  return status 401 unless params_match
  user_id, user_name = params_match.captures
  if invalid_user_info(user_id, user_name)
    status 401
  else
    routes_hash = @database.find_user_trips(user_id.to_i)
    routes_hash[:map_title] = "#{user_name}'s trips"
    routes_hash.to_json
  end
end

get '/list/:country_id/cities_list' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  country_id = params[:country_id]
  @cities_list = @database.all_cities_in_country(country_id)
  @cities_list.to_json
end

get '/list/:city_id/airports_list' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  city_id = params[:city_id]
  @airports_list = @database.all_airports_in_city(city_id)
  @airports_list.to_json
end

def parse_ajax_param(param)
  ['null', ''].include?(param) ? nil : param
end

def invalid_password_error(password)
  if password.nil?
    'Must enter a password'
  elsif password.length < 6 || password.length > 25
    'Password must be between 6 and 25 characters'
  end
end

def invalid_user_name_error(user_name)
  if user_name.nil?
    'Must enter something for your username'
  elsif !(user_name =~ /[a-zA-Z]/)
    'Username must contain letters'
  elsif user_name.length > 30
    'Username must be less than 30 characters long'
  elsif @database.user_name_exists?(user_name)
    'Sorry, username already taken'
  end
end

post '/register' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  user_name = parse_ajax_param(params['user_name'])
  password = parse_ajax_param(params['password'])

  error = invalid_password_error(password) || invalid_user_name_error(user_name)
  if error
    { status: 'error', content: error }.to_json
  else
    password_hsh = BCrypt::Password.create(password)
    session[:user_id] = @database.create_new_user(user_name, password_hsh, session[:user_id])
    session[:user_name] = user_name
    { status: 'success',
      content: { user_name: user_name, link: create_user_link } }.to_json
  end
end

post '/sign_in' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  user_name = parse_ajax_param(params['user_name'])
  password = parse_ajax_param(params['password'])

  error = 'Must enter user id and password' if password.nil? || user_name.nil?
  return { status: 'error', content: error }.to_json if error

  user_info = @database.find_user_info(user_name)
  if user_info.nil?
    { status: 'error', content: "Sorry, that user id doesn't exist" }.to_json
  elsif BCrypt::Password.new(user_info[:password_hsh]) != password
    { status: 'error', content: 'Sorry, incorrect password' }.to_json
  else
    @database.save_temp_trips(user_info[:id], session[:user_id])
    session[:user_name] = user_name
    session[:user_id] = user_info[:id]
    { status: 'success',
      content: { user_name: user_name, link: create_user_link } }.to_json
  end
end

post '/sign_out' do
  session.clear
  status 204
end

post '/save_trip' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  route_id = params['route_id']

  if @database.user_trip_count(session[:user_id]) >= 300
    error = "Sorry, you've reached your trip limit.  Delete another trip to add this one."
    { status: 'error', content: error }.to_json
  else
    @database.add_user_trip(route_id, session[:user_id])
    { status: 'success', content: 'Trip saved!' }.to_json
  end
end

post '/delete_trip' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  route_id = params['route_id']
  @database.delete_user_trip(route_id, session[:user_id])

  { status: 'success', content: 'Trip deleted!' }.to_json
end

get '/saved_trips' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'

  routes_hash = @database.find_user_trips(session[:user_id])
  routes_hash[:map_title] = 'Your trips'
  if routes_hash[:routes].empty?
    error_message = "You don't have any saved trips (click on routes to save trips)"
    { status: 'error', content: error_message}.to_json
  else
    { status: 'success', content: routes_hash.to_json }.to_json
  end
end

get '/searched_routes' do
  redirect '/' unless env['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'
  source_airport = parse_ajax_param(params['source_airport'])
  source_country = parse_ajax_param(params['source_country'])
  source_city = parse_ajax_param(params['source_city'])
  dest_airport = parse_ajax_param(params['dest_airport'])
  dest_city = parse_ajax_param(params['dest_city'])
  dest_country = parse_ajax_param(params['dest_country'])

  if ((source_country && source_country != 'int') || (dest_country && dest_country != 'int'))
    routes_hash = @database.find_searched_routes(source_airport_id: source_airport,
                                                 source_city_id: source_city,
                                                 source_country_id: source_country,
                                                 dest_airport_id: dest_airport,
                                                 dest_city_id: dest_city,
                                                 dest_country_id: dest_country)

    { status: 'success', content: routes_hash.to_json }.to_json
  else
    error = 'Must choose at least a source country or destination country'
    { status: 'error', content: error }.to_json
  end
end

after do
  @database.close_connection
end
