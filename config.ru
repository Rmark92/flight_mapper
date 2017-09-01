require "#{File.dirname(__FILE__)}/flight_mapper.rb"
$stdout.sync = true

run Sinatra::Application
