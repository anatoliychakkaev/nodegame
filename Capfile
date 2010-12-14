load 'deploy' if respond_to?(:namespace) # cap2 differentiator

##################################
# Edit these
set :application, "boardgames"
set :node_file, "app.js"
set :host, "node.xpend.net"
# ssh_options[:keys] = [File.join(ENV["HOME"], ".ec2", "default.pem")]
set :repository, "git@github.com:anatoliychakkaev/nodegame.git"
set :branch, "master"
set :deploy_to, "/var/www/apps/#{application}"
set :application_port, "1603"
####################################

set :scm, :git
set :deploy_via, :remote_cache
role :app, host
set :user, "anatoliy"
set :use_sudo, true
set :admin_runner, 'anatoliy'
#default_run_options[:pty] = true

namespace :deploy do
  task :start, :roles => :app, :except => { :no_release => true } do
    run "sudo /usr/local/bin/node #{current_path}/#{node_file} #{application_port} >> #{shared_path}/log/#{application}.log 2>&1 &"
  end

  task :restart do
    run "sudo /usr/local/bin/node #{current_path}/#{node_file} #{application_port} >> #{shared_path}/log/#{application}.log 2>&1 &"
  end

  desc "Update submodules"
  task :update_submodules, :roles => :app do
    run "cd #{release_path}; git submodule init && git submodule update"
  end

  task :create_deploy_to_with_sudo, :roles => :app do
    run "sudo mkdir -p #{deploy_to}"
    run "sudo chown #{admin_runner}:#{admin_runner} #{deploy_to}"
  end

end

before 'deploy:setup', 'deploy:create_deploy_to_with_sudo'
after "deploy:finalize_update", "deploy:update_submodules"
