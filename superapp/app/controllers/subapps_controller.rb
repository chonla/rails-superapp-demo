require "net/http"
require "nokogiri"

class SubappsController < ApplicationController
  PASSTHROUGH_HEADERS = %w[Cache-Control ETag Last-Modified Expires Vary].freeze

  URL_ATTRS = {
    "a"      => %w[href],
    "area"   => %w[href],
    "link"   => %w[href],
    "img"    => %w[src srcset],
    "source" => %w[src srcset],
    "script" => %w[src],
    "iframe" => %w[src],
    "audio"  => %w[src],
    "video"  => %w[src poster],
    "track"  => %w[src],
    "embed"  => %w[src],
    "object" => %w[data],
    "form"   => %w[action],
    "button" => %w[formaction],
    "input"  => %w[formaction]
  }.freeze

  GLOB_FLAGS = File::FNM_PATHNAME | File::FNM_EXTGLOB

  def show
    entry = Rails.application.config.subapp_registries.find { |s| s[:name] == params[:name] }
    return head :not_found unless entry

    uri = URI.join(entry[:baseurl] + "/", params[:path].to_s)
    upstream = Net::HTTP.start(uri.host, uri.port) do |http|
      req = Net::HTTP::Get.new(uri.request_uri)
      req["Accept"] = request.headers["Accept"].to_s
      turbo_frame = request.headers["Turbo-Frame"].to_s
      req["Turbo-Frame"] = turbo_frame unless turbo_frame.empty?
      http.request(req)
    end

    PASSTHROUGH_HEADERS.each do |header|
      response.set_header(header, upstream[header]) if upstream[header]
    end

    content_type = upstream["content-type"] || "application/octet-stream"
    body = upstream.body
    body = rewrite_html(body, entry) if content_type.start_with?("text/html")

    render body: body, content_type: content_type, status: upstream.code.to_i
  end

  private

  def rewrite_html(body, entry)
    doc = Nokogiri::HTML(body)
    prefix = "/subapps/#{entry[:name]}"
    globs  = entry[:paths] || []

    URL_ATTRS.each do |tag, attrs|
      doc.css(tag).each do |node|
        attrs.each do |attr|
          value = node[attr]
          next if value.nil? || value.empty?

          node[attr] = (attr == "srcset") ? rewrite_srcset(value, prefix, globs)
                                          : rewrite_url(value, prefix, globs)
        end
      end
    end

    doc.to_html
  end

  def rewrite_url(value, prefix, globs)
    return value unless root_relative?(value)

    path, query = value.split("?", 2)
    return value unless globs.any? { |g| File.fnmatch?(g, path, GLOB_FLAGS) }

    [ prefix + path, query ].compact.join("?")
  end

  def rewrite_srcset(value, prefix, globs)
    value.split(",").map do |item|
      item = item.strip
      next item if item.empty?

      url, descriptor = item.split(/\s+/, 2)
      [ rewrite_url(url, prefix, globs), descriptor ].compact.join(" ")
    end.join(", ")
  end

  def root_relative?(value)
    value.start_with?("/") && !value.start_with?("//")
  end
end
