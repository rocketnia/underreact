// underreact-lambda.js

// Copyright (c) 2013, Ross Angle
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//
// * Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the
// distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.

function makeLambdaLangNameMap() {
    return new Map().init( {
        keyHash: function ( k ) {
            return k;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        }
    } );
}

function runLambdaLang( context, envImpl, outImpl, code ) {
    var freeVars = code.getFreeVars();
    var envImplArr = [];
    var varInfoByIndex = [];
    var varInfoByName = freeVars.map( function ( unused, name ) {
        if ( !envImpl.has( name ) )
            throw new Error();
        var impl = envImpl.get( name );
        var type = stripType( impl );
        var index = envImplArr.length;
        envImplArr.push( impl );
        varInfoByIndex.push( { name: name, type: type } );
        return { index: index, type: type };
    } );
    var outType = stripType( outImpl );
    var compiled =
        code.compile( varInfoByIndex, varInfoByName, outType );
    compiled.install( context,
        _.arrFoldr( envImplArr, typeOne(), function ( impl, rest ) {
            return typeTimes( impl, rest );
        } ),
        outImpl );
}

function LambdaLangCode() {}
LambdaLangCode.prototype.init = function () {
    return this;
};
LambdaLangCode.prototype.refineOutType = function ( outType ) {
    return this;
};

var lambdaLang = {};

lambdaLang.va = function ( name ) {
    if ( !_.isString( name ) )
        throw new Error();
    name += "";
    
    var result = new LambdaLangCode().init();
    result.getFreeVars = function () {
        var freeVars = makeLambdaLangNameMap();
        freeVars.set( name, true );
        return freeVars;
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var remainingEnvType = _.arrFoldr( varInfoByIndex, typeOne(),
            function ( varInfo, rest ) {
                return typeTimes( varInfo.type, rest );
            } );
        var seq = [];
        for ( var i = varInfoByName.get( name ).index; 0 < i; i-- ) {
            seq.push( behSnd(
                remainingEnvType.first, remainingEnvType.second ) );
            remainingEnvType = remainingEnvType.second;
        }
        seq.push( behFst(
            remainingEnvType.first, remainingEnvType.second ) );
        return behSeqsArr( seq );
    };
    return result;
};

lambdaLang.fn = function ( argName, body ) {
    if ( !_.isString( argName ) )
        throw new Error();
    argName += "";
    if ( !(body instanceof LambdaLangCode) )
        throw new Error();
    
    var result = new LambdaLangCode().init();
    result.getFreeVars = function () {
        var freeVars = body.getFreeVars().copy();
        freeVars.del( name );
        return freeVars;
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "anytimeFn" )
            throw new Error();
        var argType = outType.demand;
        var innerOutType = outType.response;
        var innerVarInfoByIndex = [ { name: argName, type: argType }
            ].concat( varInfoByIndex );
        var innerVarInfoByName = varInfoByName.map(
            function ( varInfo ) {
            
            return { index: varInfo.index + 1, type: varInfo.type };
        } );
        innerVarInfoByName.set(
            argName, { index: 0, type: argType } );
        
        return behClosure( behSeqs(
            behSwap(
                _.arrFoldr( varInfoByIndex, typeOne(),
                    function ( varInfo, rest ) {
                    
                    return typeTimes( varInfo.type, rest );
                } ),
                argType ),
            body.compile( innerVarInfoByIndex, innerVarInfoByName,
                innerOutType )
        ) );
    };
    return result;
};

lambdaLang.call = function ( op, argType, argVal ) {
    var result = new LambdaLangCode().init();
    result.getFreeVars = function () {
        return op.getFreeVars().plus( argVal.getFreeVars() );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var opType = typeAnytimeFn( argType, outType, null );
        return behSeqs(
            behDupPar(
                op.compile( varInfoByIndex, varInfoByName, opType ),
                argVal.compile(
                    varInfoByIndex, varInfoByName, argType )
            ),
            behCall( opType )
        );
    };
    return result;
};

lambdaLang.beh = function ( beh ) {
    // TODO: See if we should take some kind of offsetMillis
    // parameter, rather than using the behavior's own inType to
    // determine the time offsets.
    var result = new LambdaLangCode().init();
    result.getFreeVars = function () {
        return makeLambdaLangNameMap();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var diff = typesUnify( outType, beh.outType );
        if ( !diff )
            throw new Error();
        
        return behClosure( behSeqs(
            behSnd( typeOne(), typePlusOffsetMillis(
                diff.offsetMillis, beh.inType ) ),
            beh
        ) );
    };
    return result;
};

lambdaLang.delay = function ( delayMillis, body ) {
    var result = new LambdaLangCode().init();
    result.getFreeVars = function () {
        return body.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var midType = typePlusOffsetMillis( -delayMillis, outType );
        
        return behSeqs(
            body.compile( varInfoByIndex, varInfoByName, midType ),
            behDelay( delayMillis, midType )
        );
    };
    return result;
};
