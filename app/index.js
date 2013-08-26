'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');

var cheerio = require('cheerio');
var nopt = require('nopt');
var yeoman = require('yeoman-generator');

var H5BPGenerator = module.exports = function H5BPGenerator(args, options, config) {

    yeoman.generators.Base.apply(this, arguments);

    this.on('end', function () {
        console.log('done');
    });

};

util.inherits(H5BPGenerator, yeoman.generators.NamedBase);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

H5BPGenerator.prototype._determineValue = function (defaultOpt, value) {
    if ( value === true ||
         // if the `default` comment line option is true,
         // all other posible options are true by default
         defaultOpt === true && value === undefined ) {
        return true;
    }
    return false;
};

H5BPGenerator.prototype._convertObject = function (obj) {

    var defaultOpt = obj.default;

    return {

        cssDir: obj.cssdir === undefined ? 'css' : obj.cssdir ,
        docDir: obj.docdir === undefined ? 'doc' : obj.docdir,
        imgDir: obj.imgdir === undefined ? 'img' : obj.imgdir,
        jsDir:  obj.jsdir  === undefined ?  'js' : obj.jsdir,

        cssFiles: {
            'main.css': this._determineValue(defaultOpt, obj['main-css']),
            'normalize': this._determineValue(defaultOpt, obj['normalize'])
        },

        jsFiles: {
            'jquery': this._determineValue(defaultOpt, obj['jquery']),
            'main.js': this._determineValue(defaultOpt, obj['main-js']),
            'modernizr': this._determineValue(defaultOpt, obj['modernizr']),
            'plugins.js': this._determineValue(defaultOpt, obj['plugins-js'])
        },

        otherFiles: {
            '.htaccess': this._determineValue(defaultOpt, obj['htaccess']),
            '404.html': this._determineValue(defaultOpt, obj['404']),
            'apple-touch-icon': this._determineValue(defaultOpt, obj['apple-touch-icons']),
            'crossdomain.xml': this._determineValue(defaultOpt, obj['crossdomain-xml']),
            'favicon.ico': this._determineValue(defaultOpt, obj['favicon']),
            'humans.txt': this._determineValue(defaultOpt, obj['humans-txt']),
            'index.html': this._determineValue(defaultOpt, obj['index']),
            'robots.txt': this._determineValue(defaultOpt, obj['robots-txt'])
        },

        'google-analytics': this._determineValue(defaultOpt, obj['google-analytics']),
        'documentation': this._determineValue(defaultOpt, obj['documentation'])

    };
};

H5BPGenerator.prototype._copyDir = function (srcDir, destDir, files, recursive) {

    var cwd = path.join(this.sourceRoot(), srcDir);
    var file;

    this.expand( '*', {
        cwd: cwd,
        dot: true
    }).forEach(function (el) {

        if ( fs.lstatSync(path.join(cwd, el)).isDirectory() === true ) {
            if ( recursive === true ) {
                this._copyDir(path.join(srcDir, el), path.join(destDir, el), files, recursive);
            }
        } else {

            if ( files !== undefined ) {
                for ( file in files ) {
                    if ( files.hasOwnProperty(file) &&
                        files[file] === true && el.indexOf(file) === 0 ) {
                            this.copy(path.join(srcDir, el), path.join(destDir, el));
                            break;
                        }
                }
            } else {
                this.copy(path.join(srcDir, el), path.join(destDir, el));
            }

        }

    }, this);


};

H5BPGenerator.prototype._removeObjProps = function (object, files) {

    var file,
        result = {};

    for ( file in object ) {
        if ( object.hasOwnProperty(file) && files.indexOf(file) === -1 ) {
            result[file] = object[file];
        }
    }

    return result;
}

H5BPGenerator.prototype._updateFilePaths = function (selector, attribute, $, srcDir, destDir, files) {

    var file;

    for ( file in files ) {
        if ( files.hasOwnProperty(file) && files[file] === true ) {
            var elem = $(selector + '[' + attribute + '*="' + file + '"]' +
                    '[' + attribute + '^="' + srcDir + '"]');
            if ( srcDir !== destDir &&
                    elem.attr(attribute) !== undefined ) {
                        elem.attr(attribute, elem.attr(attribute).replace(srcDir, destDir));
                    }
            elem.attr('data-checked', '');
        }
    }

};

H5BPGenerator.prototype._updateIndexFile = function (choices) {

    var $ = cheerio.load(this.readFileAsString(path.join(this.sourceRoot(), 'index.html'))),
        inlineScripts = $('script:not([src])'),
        jQueryInlineScript = inlineScripts.eq(0),
        gaInlineScript = inlineScripts.eq(1);

    // ...

    this._updateFilePaths('link', 'href', $, 'css', choices.cssDir, choices.cssFiles);
    this._updateFilePaths('script', 'src', $, 'js', choices.jsDir, choices.jsFiles);

    // jQuery and the Google Analytics snippet require special treatment
    if ( choices.jsFiles['jquery'] === true ) {
        $('script[src$="jquery.min.js"]').attr('data-checked','');
        jQueryInlineScript.html(jQueryInlineScript.html()
                .replace('js', choices.jsDir));
        jQueryInlineScript.attr('data-checked','');
    }

    if ( choices['google-analytics'] === true ) {
        gaInlineScript.attr('data-checked','');
    } else {
        // remove the `Google Analytics` comment
        // ( you can do this using `parseHTML` but it's way to
        //   much code and also way worse in terms of performance )
        $.load($.html().toString().replace(/<!--\s*Google\sAnalytics.*-->/g, ''));
    }

    // remove unmarked scripts and stylesheets
    $('link:not([data-checked])').remove();
    $('script:not([data-checked])').remove();
    $('[data-checked]').removeAttr('data-checked');

    this.write('index.html', $.html());

};


H5BPGenerator.prototype._updateHtaccessFile = function (choices) {
    this.write('.htaccess', this.read('.htaccess').replace(/ErrorDocument/g, '# ErrorDocument'));
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

H5BPGenerator.prototype.getUserChoices = function () {

	var cb = this.async();
    var choicesCSSFiles = [
        {
            name: 'main.css',
            value: 'main.css',
            checked: true
        },
        {
            name: 'normalize.css',
            value: 'normalize.css',
            checked: true
        }
    ];

    var choicesJSFiles = [
        {
            name: 'main.js',
            value: 'main.js',
            checked: true
        },
        {
            name: 'plugins.js',
            value: 'plugins.js',
            checked: true
        },
        {
            name: 'jQuery',
            value: 'jquery',
            checked: true
        },
        {
            name: 'Modernizr',
            value: 'modernizr',
            checked: true
        }
    ];

    var choicesOtherFiles = [
        {
            name: '.htaccess',
            value: '.htaccess',
        },
        {
            name: '404.html',
            value: '404.html',
        },
        {
            name: 'apple-touch-icons',
            value: 'apple-touch-icon',
            checked: true
        },
        {
            name: 'crossdomain.xml',
            value: 'crossdomain.xml',
        },
        {
            name: 'favicon.ico',
            value: 'favicon.ico',
            checked: true
        },
        {
            name: 'humans.txt',
            value: 'humans.txt',
            checked: true
        },
        {
            name: 'index.html',
            value: 'index.html',
            checked: true
        },
        {
            name: 'robots.txt',
            value: 'robots.txt',
            checked: true
        }
    ];

    var questions = [
        {
            type: 'input',
            name: 'cssDir',
            default: 'css',
            message: 'Where do you want your CSS files to be stored?'
        },
        {
            type: 'checkbox',
            name: 'cssFiles',
            message: 'Which CSS files do you want?',
            choices: choicesCSSFiles
        },
        {
            type: 'input',
            name: 'jsDir',
            default: 'js',
            message: 'Where do you want your JavaScript files to be stored?:'
        },
        {
            type: 'checkbox',
            name: 'jsFiles',
            message: 'Which JavaScript files do you want?',
            choices: choicesJSFiles
        },
        {
            type: 'checkbox',
            name: 'otherFiles',
            message: 'What other files do you want?',
            choices: choicesOtherFiles
        },
        {
            type: 'confirm',
            name: 'documentation',
            message: 'Would you like docs to be included?',
            default: false,
        },
        {
            type: 'input',
            name: 'docDir',
            message: 'Where do you want the doc files to be stored?',
            default: 'doc'
        },
        {
            type: 'confirm',
            name: 'google-analytics',
            message: 'Would you like Google Analytics to be included?',
            default: false
        }
    ];

    var clOpts = {

        // default
        'default': Boolean,

        // directories
        'cssdir': path,
        'docdir': path,
        'imgdir': path,
        'jsdir':  path,

        // CSS files
        'main-css': Boolean,
        'normalize': Boolean,

        // JavaScript files
        'jquery': Boolean,
        'main-js': Boolean,
        'modernizr': Boolean,
        'plugins-js': Boolean,

        // other files
        'htaccess': Boolean,
        '404': Boolean,
        'apple-touch-icons': Boolean,
        'crossdomain-xml': Boolean,
        'favicon': Boolean,
        'humans-txt': Boolean,
        'index': Boolean,
        'robots-txt': Boolean,

        // other options
        'google-analytics': Boolean,
        'documentation': Boolean,

    };

    var clOptsShortHands = {

        'doc': [ '--documentation' ],
        'no-doc': [ '--no-documentation' ],

        'ga': [ '--google-analytics' ],
        'no-ga': [ '--no-google-analytics' ]

    };


    // process command-line options
    if ( process.argv.length > 3 ) {  // 0 → node / 1 → yo / 2 → h5bp

        // convert the object generated by `nopt`
        // to one that can be easily used internally
        this.choices = this._convertObject(nopt(clOpts, clOptsShortHands, process.argv, 3));

    // process prompt options
    } else {

        // TODO: smarter prompt
        this.prompt(questions, function (choices) {
            this.choices = choices;
            cb();
        }.bind(this));
    }

};

H5BPGenerator.prototype.copyFiles = function () {

    var rootFiles = this._removeObjProps(this.choices.otherFiles, [ '.htaccess', 'index.html' ]);

    // yeoman actions#write doesn't have a option to force write:
    // https://github.com/yeoman/generator/wiki/base#actionswrite
    this._copyDir('', '', rootFiles);
    this._copyDir('css', this.choices.cssDir, this.choices.cssFiles);
    this._copyDir('js', this.choices.jsDir, this.choices.jsFiles, true);

    if ( this.choices.documentation === true ) {
        this._copyDir('doc', this.choices.docDir);
    }

    if ( this.choices.documentation === true ) {
        this.mkdir('img');
    }

};

H5BPGenerator.prototype.updatedFiles = function () {

    if ( this.choices.otherFiles['index.html'] === true ) {
        this._updateIndexFile(this.choices);
    }

    if ( this.choices.otherFiles['.htaccess'] === true &&
         this.choices.otherFiles['404.html'] === false ) {
        this._updateHtaccessFile(this.choices);
    }

};
