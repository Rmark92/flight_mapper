require 'pg'

class FlightDB
  def initialize(logger)
    @logger = logger
    @db = if Sinatra::Base.production?
            PG.connect(ENV['DATABASE_URL'])
          else
            PG.connect(dbname: 'flight_mapper')
          end
  end

  def close_connection
    @db.finish
  end

  def query(statement, *params)
    @logger.info "#{statement}: #{params}"
    @db.exec_params(statement, params)
  end

  def all_users
    sql = 'SELECT id, name FROM users WHERE NOT temp_user;'

    result = query(sql)
    result.map do |tuple|
      { id: tuple['id'],
        name: tuple['name'] }
    end
  end

  def all_countries
    sql = 'SELECT * FROM countries ORDER BY name;'
    result = query(sql)
    result.map do |tuple|
      { name: tuple['name'], id: tuple['id'] }
    end
  end

  def all_cities_in_country(country_id)
    sql = 'SELECT * FROM cities WHERE country_id = $1 ORDER BY name;'
    result = query(sql, country_id)
    result.map do |tuple|
      { name: tuple['name'], id: tuple['id'] }
    end
  end

  def all_airports_in_city(city_id)
    sql = 'SELECT * FROM airports WHERE city_id = $1 ORDER BY name;'
    result = query(sql, city_id)
    result.map do |tuple|
      { name: tuple['name'], id: tuple['id'] }
    end
  end

  def find_searched_routes(all_query_args)
    params = args_to_db_params(all_query_args)

    if params[:source_type] && params[:dest_type]
      find_routes_source_to_dest(params[:source_type], params[:source_val],
                                 params[:dest_type], params[:dest_val])
    elsif params[:source_type]
      find_routes_source_to_all(params[:source_type], params[:source_val])
    elsif params[:dest_type]
      find_routes_all_to_dest(params[:dest_type], params[:dest_val])
    end
  end

  def find_user_trips(user_id)
    condition = <<~CONDITION
      WHERE routes.id IN
        (SELECT route_id
        FROM trips
        WHERE user_id = $1)
    CONDITION
    routes_result = query(build_routes_query(condition), user_id)
    routes_mdata = query(build_routes_mdata_query(condition), user_id)
    { routes: routes_result_to_hashes(routes_result),
      mdata: mdata_to_hashes(routes_mdata) }
  end

  def find_user_info(user_name)
    sql = 'SELECT id, password_hsh FROM users WHERE name = $1;'
    result = query(sql, user_name)

    if result.any?
      result.map do |tuple|
        { password_hsh: tuple['password_hsh'],
          id: tuple['id'] }
      end.first
    else
      nil
    end
  end

  def user_trip_count(user_id)
    sql = <<~STATEMENT
          SELECT count(user_id)
          FROM trips
          WHERE user_id = $1;
          STATEMENT
    result = query(sql, user_id)
    result.first['count'].to_i
  end

  def create_temp_user
    delete_old_temp_users
    sql = 'INSERT INTO users DEFAULT VALUES RETURNING id'

    result = query(sql)
    result.first['id']
  end

  def user_name_exists?(user_name)
    sql = 'SELECT 1 FROM users WHERE name = $1;'
    result = query(sql, user_name)
    result.any?
  end

  def create_new_user(user_name, password_hsh, temp_user_id = nil)
    sql = 'INSERT INTO users(name, password_hsh, temp_user)
            VALUES($1, $2, false)
            RETURNING id;'
    result = query(sql, user_name, password_hsh)
    user_id = result.first['id']
    save_temp_trips(user_id, temp_user_id) if temp_user_id
    user_id
  end

  def save_temp_trips(user_id, temp_user_id)
    sql = 'UPDATE trips SET user_id = $1 WHERE (user_id = $2 AND user_id != $1);'
    query(sql, user_id, temp_user_id)
    sql = 'DELETE FROM users WHERE id = $1;'
    query(sql, temp_user_id)
  end

  def add_user_trip(route_id, user_id)
    sql = <<~STATEMENT
          INSERT INTO trips(user_id, route_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
              SELECT 1
              FROM trips
              WHERE user_id = $1 AND route_id = $2
            );
    STATEMENT
    query(sql, user_id, route_id)
  end

  def delete_user_trip(route_id, user_id)
    sql = 'DELETE FROM trips WHERE user_id = $1 AND route_id = $2;'
    query(sql, user_id, route_id)
  end

  def all_user_trips
    condition = <<~CONDITION
      WHERE routes.id IN (
        SELECT trips.route_id
        FROM trips
        ORDER BY created_on DESC LIMIT 30
      )
      CONDITION
    routes_result = query(build_routes_query(condition))
    routes_mdata = query(build_routes_mdata_query(condition))

    { routes: routes_result_to_hashes(routes_result),
      mdata: mdata_to_hashes(routes_mdata) }
  end

  private

  def build_routes_mdata_query(condition)
    <<~STATEMENT
    WITH routes_airports AS (
          SELECT a.id AS source_airport_id, a.city_id AS source_city_id,
                 a.country_id AS source_country_id, b.id AS dest_airport_id,
                 b.city_id AS dest_city_id, b.country_id AS dest_country_id,
                 ROUND(routes.distance * 0.000621371, 2) AS distance
          FROM routes
            INNER JOIN airports a ON a.id = routes.source_id
            INNER JOIN airports b ON b.id = routes.destination_id
          #{condition}
        )
    SELECT (SELECT count(*) FROM
              (SELECT source_country_id
              FROM routes_airports
              UNION
              SELECT dest_country_id
              FROM routes_airports) AS all_country_ids
           ) AS country_count,
           (SELECT count(*) FROM
              (SELECT source_city_id
              FROM routes_airports
              UNION
              SELECT dest_city_id
              FROM routes_airports) AS all_city_ids
           ) AS city_count,
           sum(distance) AS total_distance,
           count(source_airport_id) AS route_count
    FROM routes_airports;
    STATEMENT
  end

  def build_routes_query(condition)
    <<~STATEMENT
      SELECT ST_ASText(a.geog) AS source_coordinates, ST_ASText(b.geog) AS dest_coordinates,
        a.name AS source_airport_name, b.name AS dest_airport_name,
        a_cities.name AS source_city, b_cities.name AS dest_city,
        a_countries.name AS source_country, b_countries.name AS dest_country,
        routes.id AS route_id,
        ROUND(routes.distance * 0.000621371, 2) AS distance
      FROM routes
        INNER JOIN airports a ON routes.source_id = a.id
        INNER JOIN airports b ON routes.destination_id = b.id
        INNER JOIN cities a_cities ON a.city_id = a_cities.id
        INNER JOIN cities b_cities ON b.city_id = b_cities.id
        INNER JOIN countries a_countries ON a_cities.country_id = a_countries.id
        INNER JOIN countries b_countries ON b_cities.country_id = b_countries.id
      #{condition};
    STATEMENT
  end

  def find_routes_source_to_dest(source_type, source_val, dest_type, dest_val)
    if source_type =~ /country/ && source_val == 'int'
      find_routes_int_to_dest(dest_type, dest_val)
    elsif dest_type =~ /country/ && dest_val == 'int'
      find_routes_source_to_int(source_type, source_val)
    else
      data_hash = get_routes_data("WHERE #{source_type} = $1 AND #{dest_type} = $2",
                                  source_val, dest_val)
      title = "From #{get_name(source_type, source_val)}"\
              " to #{get_name(dest_type, dest_val)}"
      data_hash.merge(map_title: title)
    end
  end

  def find_routes_source_to_int(source_type, source_val)
    data_hash = get_routes_data("WHERE #{source_type} = $1 AND a.country_id != b.country_id",
                                source_val)
    title = "International flights from #{get_name(source_type, source_val)}"
    data_hash.merge(map_title: title)
  end

  def find_routes_int_to_dest(dest_type, dest_val)
    data_hash = get_routes_data("WHERE #{dest_type} = $1 AND a.country_id != b.country_id",
                                dest_val)
    title = "International flights from #{get_name(dest_type, dest_val)}"
    data_hash.merge(map_title: title)
  end

  def find_routes_source_to_all(source_type, source_val)
    data_hash = get_routes_data("WHERE #{source_type} = $1", source_val)
    title = "From #{get_name(source_type, source_val)}"
    data_hash.merge(map_title: title)
  end

  def find_routes_all_to_dest(dest_type, dest_val)
    data_hash = get_routes_data("WHERE #{dest_type} = $1", dest_val)
    title = "From #{get_name(dest_type, dest_val)}"
    data_hash.merge(map_title: title)
  end

  def get_routes_data(condition, *ids)
    routes_result = query(build_routes_query(condition), *ids)
    routes_mdata = query(build_routes_mdata_query(condition), *ids)

    { routes: routes_result_to_hashes(routes_result),
      mdata: mdata_to_hashes(routes_mdata) }
  end

  def args_to_db_params(args)
    db_params = { 'a.id' => args[:source_airport_id],
                  'a.city_id' => args[:source_city_id],
                  'a.country_id' => args[:source_country_id],
                  'b.id' => args[:dest_airport_id],
                  'b.city_id' => args[:dest_city_id],
                  'b.country_id' => args[:dest_country_id] }

    h = {}
    h[:source_type], h[:source_val] = db_params.detect { |k, v| v && k =~ /a/ }
    h[:dest_type], h[:dest_val] = db_params.detect { |k, v| v && k =~ /b/ }
    h
  end

  def get_name(param, val)
    if param =~ /\.id/ then get_airport_code(val)
    elsif param =~ /\.city_id/ then get_city_name(val)
    elsif param =~ /\.country_id/ then get_country_name(val)
    end
  end

  def delete_old_temp_users
    sql = <<~STATEMENT
            DELETE FROM users
            WHERE temp_user AND
              age(NOW(), created_on) > '2 days';
           STATEMENT
    query(sql)
  end

  def get_city_name(id)
    sql = 'SELECT name FROM cities WHERE id = $1;'
    result = query(sql, id)
    result.first['name']
  end

  def get_country_name(id)
    sql = 'SELECT name FROM countries WHERE id = $1;'
    result = query(sql, id)
    result.first['name']
  end

  def get_airport_code(id)
    sql = 'SELECT code FROM airports WHERE id = $1;'
    result = query(sql, id)
    result.first['code']
  end

  def format_distance(distance_str)
    return '0' if distance_str.nil?
    distance_str.reverse
                .scan(/(\d*\.\d{3}|\d{3}|\d+)/)
                .join(',')
                .reverse + ' mi'
  end

  def convert_to_lat_long(sql_point_str)
    /(-?\d+.\d+)\s*(-?\d+.\d+)/.match(sql_point_str)
                               .captures
                               .map(&:to_f)
                               .reverse
  end

  def routes_result_to_hashes(result)
    result.map do |tuple|
      { source_coordinates: convert_to_lat_long(tuple['source_coordinates']),
        dest_coordinates: convert_to_lat_long(tuple['dest_coordinates']),
        source_airport_name: tuple['source_airport_name'],
        dest_airport_name: tuple['dest_airport_name'],
        source_city_name: tuple['source_city'],
        dest_city_name: tuple['dest_city'],
        source_country_name: tuple['source_country'],
        dest_country_name: tuple['dest_country'],
        route_id: tuple['route_id'],
        distance: tuple['distance'] }
    end
  end

  def mdata_to_hashes(mdata_result)
    mdata_result.map do |tuple|
      { route_count: tuple['route_count'],
        country_count: tuple['country_count'],
        city_count: tuple['city_count'],
        total_distance: format_distance(tuple['total_distance']) }
    end.first
  end
end
