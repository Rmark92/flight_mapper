require 'csv'
current_dir = File.dirname(__FILE__)

def clean_csv(csv_file, new_filename, &block)
  new_arr = CSV.read(csv_file).map do |row|
    yield(row)
  end

  csv_str = CSV.generate do |csv|
    new_arr.each { |row| csv << row }
  end

  File.open("#{new_filename}", 'w+') do |file|
    file.write(csv_str)
  end
end

clean_csv("#{current_dir}/airport_data_raw.csv", "#{current_dir}/airport_data_cleaned.csv") do |row|
  [row[1..4], row[6..7]].flatten
end

clean_csv("#{current_dir}/routes_data_raw.csv", "#{current_dir}/routes_data_cleaned.csv") do |row|
  [row[2], row[4]]
end
