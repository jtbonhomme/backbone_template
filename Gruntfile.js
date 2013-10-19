/* jshint node:true */

var fs = require('fs');
var path = require('path');

module.exports = function(grunt) {
  'use strict';

  var
    _ = grunt.util._,

    // Config files
    PKG    = grunt.file.readJSON('package.json'),
    CONFIG = (fs.existsSync('mygrunt.json') && grunt.file.readJSON('mygrunt.json')) || {},

    // Supported environments and targets
    ENVS    = ['prod', 'staging', 'dev'],
    LOGGERS = ['console', 'html', 'remote'],

    // Environment variable name
    VARNAME_ENV    = 'ENV',
    VARNAME_LOGGER = 'LOGGER',

    // Interpolation expression for templates
    JST_INTERPOLATE = /\{\{(.+?)\}\}/g,

    //         ▿ cli options            ▿ environments variables        ▿ mygrunt      ▿ defaults
    ENV    = grunt.option('env')    || process.env[VARNAME_ENV]    || CONFIG.env    || ENVS[0],
    LOGGER = grunt.option('logger') || process.env[VARNAME_LOGGER] || CONFIG.logger || null,

    // Logging regex
    LOG_REGEX = /\s+LOG(_[\w_]*)?\([^;]*\);/g;

  if (ENVS.indexOf(ENV) === -1) {
    grunt.fatal('The environment variable ' + VARNAME_ENV + '=' + ENV + ' is not supported.');
  }

  if (LOGGER && LOGGERS.indexOf(LOGGER) === -1) {
    grunt.fatal('The logger ' + LOGGER + ' is not supported.');
  }

  // Production securizartion
  if (ENV === 'prod') {
    if (LOGGER) { grunt.fail.warn('No logger in production'); }
  }

  grunt.log.writeln(grunt.log.table([8, 50], ['Env',    ENV.green]));
  grunt.log.writeln(grunt.log.table([8, 50], ['Logger', (LOGGER || 'none').green]));

  var lint = grunt.option('lint') !== false;

  // Load tasks
  require('matchdep').filter('grunt-*').forEach(grunt.loadNpmTasks);

  // Interpolation expression used for wording in EJS files
  //grunt.template.addDelimiters('wording', '{%', '%}');

  // Shell logging function
  function logShell(err, stdout, stderr, cb) {
    if (err) {
      //grunt.log.error('Command failed ' + HOST.red + ' on ' + new Date());
    } else {
      //grunt.log.ok('Command executed ' + HOST.green + ' on ' + new Date());
    }
    cb();
  }

  // Project configuration.
  grunt.initConfig({
    pkg: PKG,
    env: ENV,
    logger: LOGGER,

    dirs: {
      node:     'node_modules/',
      app:     'app/',
      js:      'app/js/',
      vendors: 'app/vendors/',
      css:     'app/css/',
      tmp:     'tmp/',
      tpl:     'app/templates/',
      public:  'public/'
    },

    files: {
      all: '**/*',
      js:  '**/*.js',
      css: '**/*.css',
      tpl: '**/*.ejs',
      img: '**/*.{png,gif,jpg,jpeg}'
    },

    meta: {
      banner: [
        '/**',
        ' * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>',
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>',
        ' */'
      ].join('\n')
    },

    // Building/Concatenating tasks
    //
    copy: {
      js: {
        expand: true,
        src: ['<%= dirs.js %><%= files.js %>'],
        dest: '<%= dirs.tmp %>'
      },
      vendors: {
        expand: true,
        flatten: true, // do not copy dir hierarchy, copy all js files directly under dest:
        src: ['<%= dirs.vendors %><%= files.js %>'],
        dest: '<%= dirs.public %>js'
      }
    },

    // Web assets processor
    // Parses directives like "//= require ..."
    mince: {
      dist: {
        src: 'app.js',
        include: [
          '<%= dirs.tmp %>app/js'
        ],
        dest: '<%= dirs.tmp %>fullapp.js'
      }
    },

    // Precompile Underscore templates to JST file
    jst: {
      compile: {
        options: {
          prettify: true,
          interpolate: JST_INTERPOLATE,
          processName: function(file) {
            return file.replace(/^.*\/templates\/(.*)\.ejs$/, '$1');
          },
          templateSettings: {
            variable: 'obj'
          }
        },
        files: {
          '<%= dirs.tmp %>jst.js': '<%= dirs.tpl %><%= files.tpl %>'
        }
      }
    },

    concat: {
      options: {
        banner: '<%= meta.banner %>'
      },
      js: {
        src: [
          '<%= mince.dist.dest %>',
          '<%= dirs.tmp %>jst.js',
          '<%= dirs.js %>boot.js'
        ],
        dest: '<%= dirs.public %>js/<%= pkg.name %>.js'
      },
      css: {
        src: [
          '<%= dirs.css %><%= files.css %>'
        ],
        dest: '<%= dirs.public %>css/<%= pkg.name %>.css'
      }
    },

    jshint: {
      files: [
        'Gruntfile.js',
        '<%= dirs.js %><%= files.js %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    clean: {
      all: [
        '<%= dirs.tmp %>*',
        '<%= dirs.public %>js/*',
        '<%= dirs.public %>css/*',
        '<%= dirs.public %>index.html'
      ],
      tmp: ['<%= dirs.tmp %>*']
    },

    // Developement tools
    //
    watch: {
      scripts: {
        files: ['<%= dirs.js %><%= files.js %>', 'Gruntfile.js'],
        tasks: ['jshint', 'copy:js', 'copy:vendors', 'mince', 'jst', 'concat:js', 'env', (LOGGER ? 'logger' : 'nologger')]
      }
    }
  });

  grunt.registerTask('index', 'Create the index.html file', function() {
    var src = grunt.config.process('<%= dirs.app %>index.html');
    var dst = grunt.config.process('<%= dirs.public %>index.html');
/*    var css = grunt.config.process('<%= dirs.public %>css/<%= pkg.name %>.css');
    var app = grunt.config.process('<%= dirs.public %>js/<%= pkg.name %>.js');
*/
    grunt.log.write('Generating ' + dst.cyan + '...');
    var template = grunt.template.process(grunt.file.read(src), { data: {
      dev:    (ENV === 'dev'),
      logger: (LOGGER === 'html')
    }});
    grunt.file.write(dst, template);
    grunt.log.ok();
  });

  grunt.registerTask('logger', 'Prepend debugging options or remove logging', function() {
    var file = grunt.config.process('<%= dirs.public %>js/<%= pkg.name %>.js');
    var data = grunt.file.read(file);
    var options = grunt.option('logger-options') || '{}';
    var filters = grunt.option('logger-filters') || '{}';
    try {
      options = JSON.parse(options);
      filters = JSON.parse(filters);
      if (typeof options !== 'object') { throw ''; }
      if (typeof filters !== 'object') { throw ''; }
    }
    catch(e) {
      grunt.warn('Non valid logger options or filters');
      options = {};
      filters = {};
    }
    options = JSON.stringify(options);
    filters = JSON.stringify(filters);

    grunt.log.write('Logging infos with options ' + options + ' to ' + file.cyan + '...');

    data = [
      '/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
      ' * !!!!! WARNING: DEBUG MODE ACTIVATED !!!!!',
      ' * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */',
      'this.DEBUG = true;',
      'this.LOGGER_NAME = "' + LOGGER + '";',
      'this.LOGGER_OPTIONS = ' + options + ';',
      'this.LOGGER_FILTERS = ' + filters + ';',
      data
    ].join('\n');

    grunt.file.write(file, data);
    grunt.log.ok();
  });

  grunt.registerTask('nologger', function() {
    var file = grunt.config.process('<%= dirs.public %>js/<%= pkg.name %>.js');
    var data = grunt.file.read(file);
    grunt.log.write('Removing log statements...');
    data = data.replace(LOG_REGEX, function(match) {
      grunt.log.verbose.writeln('Removing `' + match + '`');
      return '';
    });
    grunt.file.write(file, data);
    grunt.log.ok();
  });

  grunt.registerTask('env', function() {
    var file = grunt.config.process('<%= dirs.public %>js/<%= pkg.name %>.js');
    var data = grunt.file.read(file);
    grunt.log.write('Changing download environment...');
    data = data.replace('***ENVIRONMENT***', ENV);
    grunt.file.write(file, data);
    grunt.log.ok();
  });

  var buildJS  = ['copy:js', 'copy:vendors', 'mince', 'jst', 'concat:js', 'env', (LOGGER ? 'logger' : 'nologger')];
  var buildAll = _.compact([(lint && 'jshint'), 'clean:all', 'build:js', 'build:css', 'index', 'clean:tmp']);

  grunt.registerTask('build:css',   'Builds the css',          ['concat:css']);
  grunt.registerTask('build:js',    'Builds the javacript',    buildJS);
  grunt.registerTask('build',       'Builds the whole app',    buildAll);

  // Default
  grunt.registerTask('default', 'build');
};




