module ApplicationHelper
  def subapp_entry_path(subapp)
    path = subapp[:entrypoint].to_s.delete_prefix("/")
    path.empty? ? subapp_proxy_path(subapp[:name]) : subapp_proxy_path(subapp[:name], path)
  end
end
