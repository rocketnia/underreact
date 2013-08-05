#! /usr/bin/env node
"use strict";

var fs = require( "fs" );
var $path = require( "path" );

var _ = require( "./lib/lathe.js" );


// ===== Utilities ===================================================
//
// TODO: These utilities are copied from the
// https://github.com/rocketnia/rocketnia-sites project's osrc/util.js
// file. Make them a reusable library or something.

var $util = {};

// This should work on most versions of Node.
$util.exists = function ( path, then ) {
    if ( fs.exists )
        fs.exists( path, then );
    else
        $path.exists( path, then );
};

$util.stat = function ( path, then ) {
    $util.exists( path, function ( exists ) {
        if ( !exists )
            return void then( null, null );
        fs.stat( path, function ( e, stats ) {
            if ( e ) return void then( e );
            then( null, stats );
        } );
    } );
};

$util.ensureDirOptimistic = function ( path, then ) {
    if ( path === "." || path === "/" )
        return void _.defer( function () {
            then();
        } );
    $util.stat( path, function ( e, stats ) {
        if ( e ) return void then( e );
        if ( stats === null )
            $util.ensureDirOptimistic( $path.dirname( path ),
                function ( e ) {
                
                if ( e ) return void then( e );
                // TODO: See what permissions to create it with.
                fs.mkdir( path, function ( e ) {
                    if ( e ) return void then( e );
                    then();
                } );
            } );
        else if ( stats.isDirectory() )
            then();
        else
            then(
                "ensureDirOptimistic: A non-directory already " +
                "exists at " + path );
    } );
};

var ensureDirMutex = _.makeMutex();
$util.ensureDir = function ( path, then ) {
    ensureDirMutex.lock( function ( then ) {
        $util.ensureDirOptimistic( path, function ( e ) {
            then( e );
        } );
    }, function ( e ) {
        if ( e ) return void then( e );
        then();
    } );
};

$util.writeTextFile = function ( path, encoding, string, then ) {
    $util.ensureDir( $path.dirname( path ), function ( e ) {
        if ( e ) return void then( e );
        fs.writeFile( path, string, encoding, function ( e ) {
            if ( e ) return void then( e );
            then();
        } );
    } );
};


// ===== Build process ===============================================

_.arrMapConcurrent( [
    "lib/lathe.js",
    "src/underreact-async.js",
    "src/underreact-behaviors.js",
    "src/underreact-lambda.js"
], function ( i, path, then ) {
    fs.readFile( path, "utf-8", function ( e, text ) {
        if ( e ) then( { error: e } );
        then( { error: e, text: text } );
    } );
}, function ( results ) {
    var src = _.arrMap( results, function ( result ) {
        if ( result.error )
            throw result.error;
        return result.text;
    } );
    var latheSrc = src[ 0 ];
    var uAsyncSrc = src[ 1 ];
    var uBehaviorsSrc = src[ 2 ];
    var uLambdaSrc = src[ 3 ];
    
    function escapeForJs( str ) {
        return JSON.stringify( str ).
            replace( /\u2028/g, "\\u2028" ).  // line separator
            replace( /\u2029/g, "\\u2029" );  // paragraph separator
    }
    
    var fullExprSrc =
        "(function () { \"use strict\";\n" +
        "\n" +
        "var _ = (function () {\n" +
        "var exports = {};\n" +
        "\n" +
        "\n" +
        latheSrc + "\n" +
        "\n" +
        "\n" +
        "return exports;\n" +
        "})();\n" +
        "\n" +
        "\n" +
        uAsyncSrc + "\n" +
        "\n" +
        "\n" +
        uBehaviorsSrc + "\n" +
        "\n" +
        "\n" +
        uLambdaSrc + "\n" +
        "\n" +
        "\n" +
        "return (function () {\n" +
        "    var result = {};\n" +
        // TODO: This is a joke right now. Return a set of utilities
        // that's actually useful for something.
        "    result.behDisjoin = behDisjoin;\n" +
        "    return result;\n" +
        "})();\n" +
        "})()\n";
    var fullNodeSrc =
        "\"use strict\";\n" +
        "var exportsOrig = " + fullExprSrc + ";\n" +
        "for ( var k in exportsOrig )\n" +
        "    if ( {}.hasOwnProperty.call( exportsOrig, k ) )\n" +
        "        exports[ k ] = exportsOrig[ k ];\n";
    $util.writeTextFile(
        "fin/underreact-full.js", "utf-8", fullNodeSrc, function () {
        
        // We're done.
    } );
} );
