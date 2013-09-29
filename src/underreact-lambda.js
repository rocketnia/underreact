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

var lambdaLang = {};

lambdaLang.va = function ( name ) {
    if ( !_.isString( name ) )
        throw new Error();
    name += "";
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "$" + name;
    };
    result.getFreeVars = function () {
        var freeVars = makeLambdaLangNameMap();
        freeVars.set( name, true );
        return freeVars;
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        // TODO: See if we can change this to a simple behFst, now
        // that we only get our own free variables in the environment.
        var remainingEnvType =
            lambdaLangVarInfoByIndexToType( varInfoByIndex );
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

function lambdaLangVarInfoByIndexToType( varInfoByIndex ) {
    return _.arrFoldr( varInfoByIndex, typeOne(),
        function ( varInfo, rest ) {
        
        return typeTimes( varInfo.type, rest );
    } );
}

function lambdaLangVarInfoByIndexToByName( varInfoByIndex ) {
    var varInfoByName = makeLambdaLangNameMap();
    _.arrEach( varInfoByIndex, function ( varInfo, i ) {
        varInfoByName.set(
            varInfo.name, { type: varInfo.type, index: i } );
    } );
    return varInfoByName;
}

function behLambdaLang( origVarInfoByIndex, expr, outType ) {
    var finalFreeVars = expr.getFreeVars();
    var almostResult = _.arrFoldr( origVarInfoByIndex, {
        varTypeBefore: typeOne(),
        varInfoByIndexAfter: [],
        beh: behId( typeOne() )
    }, function ( varInfo, r ) {
        
        return finalFreeVars.has( varInfo.name ) ? {
            varTypeBefore: typeTimes( varInfo.type, r.varTypeBefore ),
            varInfoByIndexAfter:
                [ varInfo ].concat( r.varInfoByIndexAfter ),
            beh: behPar( behId( varInfo.type ), r.beh )
        } : {
            varTypeBefore: typeTimes( varInfo.type, r.varTypeBefore ),
            varInfoByIndexAfter: r.varInfoByIndexAfter,
            beh: behSeqs(
                behSnd( varInfo.type, r.varTypeBefore ),
                r.beh
            )
        };
    } );
    var varInfoByName = lambdaLangVarInfoByIndexToByName(
        almostResult.varInfoByIndexAfter );
    return behSeqs(
        almostResult.beh,
        expr.compile(
            almostResult.varInfoByIndexAfter, varInfoByName, outType )
    );
}

lambdaLang.fn = function ( argName, body ) {
    if ( !_.isString( argName ) )
        throw new Error();
    argName += "";
    if ( !(body instanceof LambdaLangCode) )
        throw new Error();
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "\$" + argName + " -> " + body.toString();
    };
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
        
        // NOTE: We only receive the variables we need, so we don't
        // need to worry about introducing a duplicate variable name
        // here. Just to be safe, however, we do a sanity check first.
        if ( varInfoByName.has( argName ) )
            throw new Error();
        var innerVarInfoByIndex = [ { name: argName, type: argType }
            ].concat( varInfoByIndex );
        
        return behClosure( behSeqs(
            behSwap( lambdaLangVarInfoByIndexToType( varInfoByIndex ),
                argType ),
            behLambdaLang( innerVarInfoByIndex, body, innerOutType )
        ) );
    };
    return result;
};

function behDupParLambdaLang( varInfoByIndex,
    firstExpr, firstOutType, secondExpr, secondOutType ) {
    
    return behDupPar(
        behLambdaLang( varInfoByIndex, firstExpr, firstOutType ),
        behLambdaLang( varInfoByIndex, secondExpr, secondOutType )
    );
}

lambdaLang.call = function ( op, argType, argVal ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
//        return "(" + op.toString() + " " +
//            typeToString( argType ) + " " + argVal.toString() + ")";
        return "(" + op.toString() + " " + argVal.toString() + ")";
    };
    result.getFreeVars = function () {
        return op.getFreeVars().plus( argVal.getFreeVars() );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var opType = typeAnytimeFn( argType, outType, null );
        return behSeqs(
            behDupParLambdaLang(
                varInfoByIndex, op, opType, argVal, argType ),
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
    result.toString = function () {
        // TODO: See if this can be more informative.
        return "#<beh:" + beh + ">";
    };
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
                diff.offsetMillis !== null ? diff.offsetMillis : 0,
                beh.inType ) ),
            beh
        ) );
    };
    return result;
};

lambdaLang.useBeh = function ( beh, argVal ) {
    // TODO: See if we should take some kind of offsetMillis
    // parameter, rather than using the behavior's own inType to
    // determine the time offsets.
    var result = new LambdaLangCode().init();
    result.toString = function () {
        // TODO: See if this can be more informative.
        return "#<useBeh:" + beh + "> " + argVal.toString();
    };
    result.getFreeVars = function () {
        return argVal.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var diff = typesUnify( outType, beh.outType );
        if ( !diff )
            throw new Error();
        
        return behSeqs(
            argVal.compile( varInfoByIndex, varInfoByName,
                typePlusOffsetMillis(
                    diff.offsetMillis !== null ?
                        diff.offsetMillis : 0,
                    beh.inType ) ),
            beh
        );
    };
    return result;
};

lambdaLang.delay = function ( delayMillis, body ) {
    if ( !isValidDuration( delayMillis ) )
        throw new Error();
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#<delay:" + delayMillis + "> " + body.toString();
    };
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

lambdaLang.one = function () {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "1";
    };
    result.getFreeVars = function () {
        return makeLambdaLangNameMap();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "one" )
            throw new Error();
        // TODO: See if we can replace this as follows, since we no
        // longer get more variables in scope than we need.
//        return behDrop( typeZero() );
        return behDrop(
            lambdaLangVarInfoByIndexToType( varInfoByIndex ) );
    };
    return result;
};

lambdaLang.times = function ( first, second ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "(" + first.toString() + " * " +
            second.toString() + ")";
    };
    result.getFreeVars = function () {
        return first.getFreeVars().plus( second.getFreeVars() );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "times" )
            throw new Error();
        return behDupParLambdaLang( varInfoByIndex,
            first, outType.first, second, outType.second );
    };
    return result;
};

lambdaLang.fst = function ( secondType, pair ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#fst " + pair.toString();
    };
    result.getFreeVars = function () {
        return pair.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        return behSeqs(
            pair.compile(
                varInfoByIndex, varInfoByName,
                typeTimes( outType, secondType ) ),
            behFst( outType, secondType )
        );
    };
    return result;
};

lambdaLang.zip = function ( pair ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#zip " + pair.toString();
    };
    result.getFreeVars = function () {
        return pair.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "atom" )
            throw new Error();
        return behSeqs(
            pair.compile(
                varInfoByIndex, varInfoByName,
                typeTimes(
                    typeAtom( 0, null ), typeAtom( 0, null ) ) ),
            behZip()
        );
    };
    return result;
};

lambdaLang.zipTimes = function ( first, second ) {
    return lambdaLang.zip( lambdaLang.times( first, second ) );
};

lambdaLang.letPlus = function ( condition, conditionType,
    leftName, leftThen, rightName, rightThen ) {
    
    if ( !(condition instanceof LambdaLangCode) )
        throw new Error();
    // TODO: Verify that conditionType is a type.
    if ( conditionType.op !== "plus" )
        throw new Error();
    if ( !_.isString( leftName ) )
        throw new Error();
    leftName += "";
    if ( !_.isString( rightName ) )
        throw new Error();
    rightName += "";
    if ( !(leftThen instanceof LambdaLangCode) )
        throw new Error();
    if ( !(rightThen instanceof LambdaLangCode) )
        throw new Error();
    
    // NOTE: This lets us avoid writing variable-shadowing code.
    var leftFn = lambdaLang.fn( leftName, leftThen );
    var rightFn = lambdaLang.fn( rightName, rightThen );
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "(#case " + condition.toString() + " " +
//            ": " + typeToString( conditionType ) + " " +
            "in " +
            "#left " + leftName + " -> " +
                leftThen.toString() + " ; " +
            "#right " + rightName + " -> " +
                rightThen.toString() + ")";
    };
    result.getFreeVars = function () {
        var leftFreeVars = leftThen.getFreeVars().copy();
        leftFreeVars.del( leftName );
        var rightFreeVars = rightThen.getFreeVars().copy();
        rightFreeVars.del( rightName );
        return condition.getFreeVars().
            plus( leftFreeVars ).plus( rightFreeVars );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var $ = lambdaLang;
        var fnsType = typeTimes(
            typeAnytimeFn( conditionType.left, outType, null ),
            typeAnytimeFn( conditionType.right, outType, null ) )
        return behSeqs(
            behLambdaLang( varInfoByIndex,
                $.times(
                    $.times(
                        $.fn( leftName, leftThen ),
                        $.fn( rightName, rightThen ) ),
                    condition ),
                typeTimes( fnsType, conditionType ) ),
            behDisjoin(
                fnsType, conditionType.left, conditionType.right ),
            behEither(
                behSeqs(
                    behFirst(
                        behFst( fnsType.first, fnsType.second ),
                        conditionType.left ),
                    behCall( fnsType.first )
                ),
                behSeqs(
                    behFirst(
                        behSnd( fnsType.first, fnsType.second ),
                        conditionType.right ),
                    behCall( fnsType.second )
                )
            ),
            behMerge( outType )
        );
    };
    return result;
};
