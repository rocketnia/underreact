// underreact-dynamic.js

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


// TODO: Implement some useful resources (to go along with
// UselessResource and DispatcherResource). Namely, it would be nice
// to have a demand monitor, a clock, a mouse listener, and an HTML
// textarea display.
//
// TODO: Implement garbage collection for resources.
//
// TODO: Implement persistence for resources, and perhaps implement a
// localStorage resource to demonstrate it with.
//
// TODO: Reimplement resources in terms of makeLinkedSigPair objects
// instead of membranes.


"use strict";


function Map() {}
Map.prototype.init = function ( opts ) {
    this.keyHash_ = opts.keyHash;
    this.keyIsoAssumingHashIso_ = opts.keyIsoAssumingHashIso;
    this.contents_ = {};
    return this;
};
Map.prototype.hash_ = function ( k ) {
    return "|" + this.keyHash_.call( {}, k );
};
Map.prototype.getEntry_ = function ( k ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        return null;
    return _.arrAny( bin, function ( entry ) {
        return self.keyIsoAssumingHashIso_.call( {}, entry.key, k ) &&
            entry;
    } ) || null;
};
Map.prototype.has = function ( k ) {
    return !!this.getEntry_( k );
};
Map.prototype.getOr = function ( k, fallback ) {
    return (this.getEntry_( k ) || { val: fallback }).val;
};
Map.prototype.get = function ( k ) {
    return this.getOr( k, null );
};
Map.prototype.set = function ( k, v ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        bin = self.contents_[ hash ] = [];
    var entry = _.arrAny( bin, function ( entry ) {
        return self.keyIsoAssumingHashIso_.call( {}, entry.key, k ) &&
            entry;
    } );
    if ( !entry )
        bin.push( entry = { key: k } );
    entry.val = v;
};
Map.prototype.del = function ( k ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        return;
    bin = self.contents_[ hash ] =
        _.arrKeep( bin, function ( entry ) {
            return !self.keyIsoAssumingHashIso_.call( {},
                entry.key, k );
        } );
    if ( bin.length === 0 )
        delete self.contents_[ hash ];
};
Map.prototype.any = function ( test ) {
    return _.objOwnAny( this.contents_, function ( hash, entries ) {
        return _.arrAny( entries, function ( entry ) {
            return test( entry.key, entry.val );
        } );
    } );
};
Map.prototype.all = function ( test ) {
    return _.objOwnAll( this.contents_, function ( hash, entries ) {
        return _.arrAll( entries, function ( entry ) {
            return test( entry.key, entry.val );
        } );
    } );
};
Map.prototype.each = function ( body ) {
    this.any( function ( k, v ) {
        body( k, v );
        return false;
    } );
};

function ElasticMap() {}
ElasticMap.prototype.init = function ( opts ) {
    this.contents_ = new Map().init( {
        keyHash: opts.keyHash,
        keyIsoAssumingHashIso: opts.keyIsoAssumingHashIso
    } );
    this.retractVal_ = opts.retractVal;
    this.makeVal_ = opts.makeVal;
    return this;
};
ElasticMap.prototype.asMap = function () {
    return this.contents_;
};
ElasticMap.prototype.getOrMake = function ( k, extraParam ) {
    if ( !this.contents_.has( k ) )
        this.contents_.set( k,
            this.makeVal_.call( {}, k, extraParam ) );
    return this.contents_.get( k );
};
ElasticMap.prototype.retract = function () {
    var self = this;
    var toDelete = [];
    var isEmpty = true;
    self.contents_.each( function ( k, v ) {
        if ( self.retractVal_.call( {}, v ) )
            toDelete.push( k );
        else
            isEmpty = false;
    } );
    _.arrEach( toDelete, function ( k ) {
        self.contents_.del( k );
    } );
    return isEmpty;
};

function isValidTime( x ) {
    return +x === x && 1 / x !== 0;
}

function isValidDuration( x ) {
    return +x === x && 1 / x !== 0;
}

function entEnd( entry ) {
    var maybeEndMillis = entry.maybeEndMillis;
    return maybeEndMillis === null ? 1 / 0 : maybeEndMillis.val;
}
function entsEnd( entries ) {
    return entEnd( entries[ entries.length - 1 ] );
}

function entDelay( delayMillis, entry ) {
    return {
        maybeData: entry.maybeData,
        startMillis: entry.startMillis + delayMillis,
        maybeEndMillis: entry.maybeEndMillis === null ? null :
            { val: entry.maybeEndMillis.val + delayMillis }
    };
}

function entsDelay( delayMillis, entry ) {
    return _.arrMap( entry, function ( entry ) {
        return entDelay( delayMillis, entry );
    } );
}

// TODO: See if we should support something other than nested Arrays
// of strings as data.
function isValidData( x ) {
    return recur( x );
    function recur( x ) {
        return _.isString( x ) ||
            (_.likeArray( x ) && _.arrAll( x, function ( elem ) {
                return recur( elem );
            } ));
    }
}
function dataHash( x ) {
    return JSON.stringify( x );
}
function dataIso( a, b ) {
    return _.jsonIso( a, b );
}
function dataIsoAssumingHashIso( a, b ) {
    return true;
}

// Log up to once every ten seconds.
//
// NOTE: We don't actually use this in this project, unless we're
// debugging.
//
var loggedLastMillis = null;
function sometimesLog( var_args ) {
    var nowMillis = new Date().getTime();
    if ( loggedLastMillis === null
        || loggedLastMillis < nowMillis - 10 * 1000 ) {
        
        loggedLastMillis = nowMillis;
        console.log.apply( console, arguments );
    }
}

function ActivityHistory() {}
ActivityHistory.prototype.init = function ( opts ) {
    if ( !isValidTime( opts.startMillis ) )
        throw new Error();
    this.syncOnAdd_ = opts.syncOnAdd;
    this.syncOnForget_ = opts.syncOnForget;
    // NOTE: We always leave at least one entry in the history so that
    // it remains impossible to add entries that overwrite previous
    // results. This is the only reason we introduce a zero-length
    // entries like this one into the history.
    this.entries_ = [ { maybeData: null,
        startMillis: opts.startMillis,
        maybeEndMillis: { val: opts.startMillis } } ];
    return this;
};
ActivityHistory.prototype.forgetBeforeMillis = function (
    memoryStartMillis ) {
    
    // NOTE: The value of `memoryStartMillis` can be Infinity.
    
    var es = this.entries_;
    var maybeEndMillis = es[ es.length - 1 ].maybeEndMillis;
    var didSomething = false;
    while (
        es.length !== 0 && entEnd( es[ 0 ] ) < memoryStartMillis ) {
        
        didSomething = true;
        es.shift();
    }
    if ( !didSomething )
        return;
    if ( es.length === 0 )
        es.push( { maybeData: null,
            startMillis: maybeEndMillis.val,
            maybeEndMillis: maybeEndMillis } );
    this.syncOnForget_.call( {} );
};
ActivityHistory.prototype.getAllEntries = function () {
    // NOTE: If we return the same Array we mutate, then an observer
    // could merely check that Array every so often, rather than using
    // our painstakingly made listener-and-getter interface. How dare
    // they enjoy that kind of freedom! Let them eat copies.
    return this.entries_.slice();
};
ActivityHistory.prototype.addEntry = function ( newEntry ) {
    
    // NOTE: If the newEntry has a startMillis equal to its
    // maybeEndMillis.val, this will add inactivity up to that
    // instant, but it won't use the newEntry's data.
    
    var self = this;
    var startMillis = newEntry.startMillis;
    if ( !(true
        && (newEntry.maybeData === null
            || isValidData( newEntry.maybeData.val ))
        && isValidTime( startMillis )
        && (newEntry.maybeEndMillis === null
            || isValidTime( newEntry.maybeEndMillis.val ))
    ) )
        throw new Error();
    if ( newEntry.maybeData !== null
        && newEntry.maybeEndMillis === null )
        throw new Error();
    if ( entEnd( newEntry ) < startMillis )
        throw new Error();
    
    function maybeIso( a, b, innerIso ) {
        return (a === null && b === null) ||
            (a !== null && b !== null && innerIso( a.val, b.val ));
    }
    
    var lastEntry = self.entries_[ self.entries_.length - 1 ];
    if ( lastEntry.maybeEndMillis === null )
        return;
    if ( lastEntry.maybeEndMillis.val < startMillis ) {
        if ( lastEntry.maybeData === null ) {
            self.entries_.pop();
            lastEntry = { maybeData: null,
                startMillis: lastEntry.startMillis,
                maybeEndMillis: { val: startMillis } };
        } else {
            lastEntry = { maybeData: null,
                startMillis: lastEntry.maybeEndMillis.val,
                maybeEndMillis: { val: startMillis } };
        }
        self.entries_.push( lastEntry );
    } else {
        startMillis = lastEntry.maybeEndMillis.val;
    }
    if ( entEnd( newEntry ) <= startMillis )
        return;
    if ( maybeIso( newEntry.maybeData, lastEntry.maybeData,
        function ( a, b ) {
        
        return dataIso( a, b );
    } ) ) {
        startMillis = lastEntry.startMillis;
        self.entries_.pop();
    }
    self.entries_.push( { maybeData: newEntry.maybeData,
        startMillis: startMillis,
        maybeEndMillis: newEntry.maybeEndMillis } );
    self.syncOnAdd_.call( {} );
};
ActivityHistory.prototype.setData = function (
    data, startMillis, endMillis ) {
    
    this.addEntry( {
        maybeData: { val: data },
        startMillis: startMillis,
        maybeEndMillis: { val: endMillis }
    } );
};
ActivityHistory.prototype.suspendData = function (
    startMillis, endMillis ) {
    
    this.addEntry( {
        maybeData: null,
        startMillis: startMillis,
        maybeEndMillis: { val: endMillis }
    } );
};
ActivityHistory.prototype.finishData = function ( startMillis ) {
    this.addEntry( {
        maybeData: null,
        startMillis: startMillis,
        maybeEndMillis: null
    } );
};

function eachZipEnts( delayMillis, entsA, entsB, body ) {
    var startMillis =
        Math.min( entsA[ 0 ].startMillis, entsB[ 0 ].startMillis );
    var ai = 0, bi = 0;
    while ( true ) {
        while ( ai < entsA.length
            && entEnd( entsA[ ai ] ) + delayMillis <= startMillis )
            ai++;
        while ( bi < entsB.length
            && entEnd( entsB[ bi ] ) <= startMillis )
            bi++;
        
        if ( !(ai < entsA.length || bi < entsB.length) )
            break;
        
        var endA = 1 / 0;
        var maybeDataA = null;
        if ( ai < entsA.length ) {
            var entA = entsA[ ai ];
            if ( startMillis < entA.startMillis + delayMillis ) {
                endA = entA.startMillis;
            } else {
                endA = entEnd( entA );
                maybeDataA = entA.maybeData;
            }
        }
        var endB = 1 / 0;
        var maybeDataB = null;
        if ( bi < entsB.length ) {
            var entB = entsB[ bi ];
            if ( startMillis < entB.startMillis ) {
                endB = entB.startMillis;
            } else {
                endB = entEnd( entB );
                maybeDataB = entB.maybeData;
            }
        }
        
        var endMillis = Math.min( endA + delayMillis, endB );
        body( maybeDataA, maybeDataB, startMillis, endMillis );
        startMillis = endMillis;
    }
}

function visualizeHistoriesOnCanvas( histories, opt_opts ) {
    var opts = _.opt( opt_opts ).or( {
        width: 500,
        rowHeight: 10,
        spacerHeight: 1,
        infinityPadMillis: 1000
    } ).bam();
    histories = _.arrMap( histories, function ( ents ) {
        return ents instanceof ActivityHistory ?
            ents.getAllEntries() : ents;
    } );
    
    function arrMin( arr, func ) {
        return _.arrFoldl( 1 / 0, arr, function ( min, item ) {
            return Math.min( min, func( item ) );
        } );
    }
    function paddedEntEnd( entry ) {
        return entry.maybeEndMillis === null ?
            entry.startMillis + opts.infinityPadMillis :
            entry.maybeEndMillis.val;
    }
    var startMillis = arrMin( histories, function ( ents ) {
        return arrMin( ents, function ( entry ) {
            return entry.startMillis;
        } );
    } );
    var endMillis = -arrMin( histories, function ( ents ) {
        return arrMin( ents, function ( entry ) {
            return -paddedEntEnd( entry );
        } );
    } );
    if ( startMillis === 1 / 0 || endMillis === -1 / 0 )
        throw new Error();
    function millisToX( millis ) {
        return opts.width *
            (millis - startMillis) / (endMillis - startMillis);
    }
    
    var fullHeight = histories.length * opts.rowHeight +
        (histories.length - 1) * opts.spacerHeight;
    var canvas = _.dom( "canvas",
        { width: "" + opts.width, height: "" + fullHeight } );
    var ctx = canvas.getContext( "2d" );
    ctx.fillStyle = "#FFFFCC";
    ctx.fillRect( 0, 0, opts.width, fullHeight );
    _.arrEach( histories, function ( ents, i ) {
        _.arrEach( ents, function ( entry ) {
            if ( entry.maybeEndMillis === null ) {
                ctx.fillStyle = "#CCFFCC";
            } else if ( entry.maybeData === null ) {
                ctx.fillStyle = "#CCCCFF";
            } else {
                ctx.fillStyle = "#000033";
            }
            var startX = millisToX( entry.startMillis );
            ctx.fillRect(
                startX,
                i * opts.rowHeight + i * opts.spacerHeight,
                millisToX( paddedEntEnd( entry ) ) - startX,
                opts.rowHeight
            );
        } );
        ctx.fillStyle = "#000000";
        ctx.fillRect(
            0, (i + 1) * opts.rowHeight + i * opts.spacerHeight,
            opts.width, opts.spacerHeight );
    } );
    return canvas;
}

// This creates a managed glue layer around a two-way channel which
// uses messages of this form:
//
// {
//     permanentUntilMillis: <timestamp>,
//     demands: <Array of> {
//         delayMillis: <duration from now to response>,
//         demandDataHistory: <history entries of> <data>
//     },
//     responses: <map-like Array of> {
//         // key
//         delayMillis: <duration from demand to now>,
//         demandData: <data>,
//
//         // value
//         responseDataHistory: <history entries of> <data>
//     }
// }
//
// The responseDataHistory should never go on forever, so that the
// receiver can garbage-collect it once it's old enough.
//
function MessageMembrane() {}
MessageMembrane.prototype.init = function (
    outPermanentUntilMillis, deferForBatching, sendMessage,
    syncOnInDemandAvailable ) {
    
    if ( !isValidTime( outPermanentUntilMillis ) )
        throw new Error();
    
    var self = this;
    self.deferForBatching_ = deferForBatching;
    self.sendMessage_ = sendMessage;
    self.sendingMessage_ = false;
    self.outDemanders_ = [];
    self.otherOutPermanentUntilMillis_ = outPermanentUntilMillis;
    self.inResponseIgnoranceMillis_ = outPermanentUntilMillis;
    // NOTE: This can be -Infinity at first, but we'll quickly bump it
    // up to be at least outPermanentUntilMillis.
    self.sentOutPermanentUntilMillis_ = -1 / 0;
    self.inPermanentUntilMillis_ = outPermanentUntilMillis;
    self.inDemands_ = [];
    self.syncOnInDemandAvailable_ = syncOnInDemandAvailable;
    
    self.outResponsesByDelayAndInput_ = new ElasticMap().init( {
        keyHash: function ( delayMillis ) {
            return "" + delayMillis;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        },
        retractVal: function ( outResponsesByInput ) {
            return outResponsesByInput.retract();
        },
        makeVal: function ( delayMillis, extraParam ) {
            return new ElasticMap().init( {
                keyHash: function ( inputData ) {
                    return dataHash( inputData );
                },
                keyIsoAssumingHashIso: function ( a, b ) {
                    return dataIsoAssumingHashIso( a, b );
                },
                retractVal: function ( history ) {
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    return entsEnd( history.getAllEntries() ) <=
                        self.otherOutPermanentUntilMillis_;
                },
                makeVal: function ( inputData, startMillis ) {
                    return new ActivityHistory().init( {
                        startMillis: startMillis,
                        syncOnAdd: function () {
                            // Do nothing.
                        },
                        syncOnForget: function () {
                            // Do nothing.
                        }
                    } );
                }
            } );
        }
    } );
    
    self.inResponsesByDelayAndInput_ = new ElasticMap().init( {
        keyHash: function ( delayMillis ) {
            return "" + delayMillis;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        },
        retractVal: function ( inResponsesByInput ) {
            return inResponsesByInput.retract();
        },
        makeVal: function ( delayMillis, extraParam ) {
            return new ElasticMap().init( {
                keyHash: function ( inputData ) {
                    return dataHash( inputData );
                },
                keyIsoAssumingHashIso: function ( a, b ) {
                    return dataIsoAssumingHashIso( a, b );
                },
                retractVal: function ( history ) {
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    return entsEnd( history.getAllEntries() ) <=
                        self.inResponseIgnoranceMillis_;
                },
                makeVal: function ( inputData, startMillis ) {
                    var history;
                    return history = new ActivityHistory().init( {
                        startMillis: startMillis,
                        syncOnAdd: function () {
                            onAddInResponse(
                                delayMillis, inputData, history );
                        },
                        syncOnForget: function () {
                            // Do nothing.
                        }
                    } );
                }
            } );
        }
    } );
    
    function onAddInResponse( delayMillis, inputData, history ) {
        var myEntries = history.getAllEntries();
        var myEndMillis = entsEnd( myEntries );
        _.arrEach( self.outDemanders_, function ( od ) {
            
            // Update this out-demander with whatever new history
            // entries it's missing.
            
            if ( od.getDelayMillis() !== delayMillis )
                return;
            var demandEntries = od.getDemandHistoryEntries();
            var demandEndMillis = entsEnd( demandEntries );
            var localResponseEndMillis =
                entsEnd( od.getResponseHistoryEntries() );
            eachZipEnts( delayMillis, demandEntries, myEntries,
                function ( maybeDemandData, maybeMyResponseData,
                    startMillis, endMillis ) {
                
                // If this is part of the already-processed response,
                // we're not started yet.
                if ( endMillis <= localResponseEndMillis )
                    return;
                
                // If the response is overtaking the demand, we're
                // done.
                if ( demandEndMillis <= startMillis )
                    return;
                
                // If the demand is overtaking the response, we're
                // done.
                if ( myEndMillis <= startMillis )
                    return;
                
                var maybeEndMillis =
                    endMillis === 1 / 0 ? null : { val: endMillis };
                var maybeLocalResponseData = null;
                if ( maybeDemandData !== null
                    && dataIso( maybeDemandData.val, inputData ) ) {
                    
                    // NOTE: This is a sanity check to make sure the
                    // membrane obeys duration coupling for demand
                    // responses.
                    if ( maybeMyResponseData === null ) {
                        var offendingInterval = [ {
                            maybeData: { val: [] },
                            startMillis: startMillis,
                            maybeEndMillis: { val: endMillis }
                        } ];
                        var delayedDemandEntries =
                            entsDelay( delayMillis, demandEntries );
                        // TODO: See if we can set up a debug
                        // configuration that makes sense for this.
                        false && _.appendDom( document.body,
                            _.dom( "p",
                                visualizeHistoriesOnCanvas( [
                                    offendingInterval,
                                    delayedDemandEntries,
                                    myEntries
                                ] ) )
                        );
                        // TODO: See if we can set up a debug
                        // configuration that makes sense for this.
                        console.log(
                            "Warning: A membrane neglected to " +
                            "respond to all its demand." );
                    }
                    
                    maybeLocalResponseData = { val: [
                        maybeDemandData.val
                    ].concat(
                        maybeMyResponseData === null ? [] :
                            [ maybeMyResponseData.val ]
                    ) };
                }
                
                od.addResponseHistoryEntry( {
                    maybeData: maybeLocalResponseData,
                    startMillis: startMillis,
                    maybeEndMillis: maybeEndMillis
                } );
            } );
        } );
        self.scrapOutDemanders_();
    }
    
    self.triggerSendMessage_();
    
    return self;
};
MessageMembrane.prototype.updateInResponseIgnoranceMillis_ =
    function () {
    
    var self = this;
    self.inResponseIgnoranceMillis_ =
        self.otherOutPermanentUntilMillis_;
    _.arrEach( self.outDemanders_, function ( od ) {
        self.inResponseIgnoranceMillis_ = Math.min(
            self.inResponseIgnoranceMillis_,
            od.getResponseHistoryEntries()[ 0 ].startMillis
        );
    } );
};
MessageMembrane.prototype.scrapOutDemanders_ = function () {
    this.outDemanders_ =
        _.arrKeep( this.outDemanders_, function ( od ) {
            return !od.isScrappable();
        } );
    this.updateInResponseIgnoranceMillis_();
};
MessageMembrane.prototype.makeOutResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return this.outResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
MessageMembrane.prototype.makeInResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return this.inResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
MessageMembrane.prototype.triggerSendMessage_ = function () {
    var self = this;
    if ( self.sendingMessage_ )
        return;
    self.sendingMessage_ = true;
    self.deferForBatching_.call( {}, function () {
        self.sendingMessage_ = false;
        
        var outPermanentUntilMillis =
            self.otherOutPermanentUntilMillis_;
        var demandHistory = _.acc( function ( y ) {
            _.arrEach( self.outDemanders_, function ( od ) {
                var ents = od.readDemandHistoryEntries();
                if ( ents === null )
                    return;
                y( {
                    delayMillis: od.getDelayMillis(),
                    demandDataHistory: ents
                } );
                outPermanentUntilMillis = Math.min(
                    outPermanentUntilMillis, entsEnd( ents ) );
            } );
            self.scrapOutDemanders_();
        } );
        var responses = _.acc( function ( y ) {
            self.outResponsesByDelayAndInput_.asMap().each(
                function ( delayMillis, outResponsesByInput ) {
                
                outResponsesByInput.asMap().each(
                    function ( inputData, history ) {
                    
                    var ents = history.getAllEntries();
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    history.forgetBeforeMillis( entsEnd( ents ) );
                    y( {
                        delayMillis: delayMillis,
                        inputData: inputData,
                        responseDataHistory: ents
                    } );
                } );
            } );
            self.outResponsesByDelayAndInput_.retract();
        } );
        if ( self.sentOutPermanentUntilMillis_ ===
                outPermanentUntilMillis
            && demandHistory.length === 0
            && responses.length === 0 )
            return;
        self.sentOutPermanentUntilMillis_ = outPermanentUntilMillis;
        self.sendMessage_.call( {}, {
            permanentUntilMillis: outPermanentUntilMillis,
            demands: demandHistory,
            responses: responses
        } );
    } );
};
MessageMembrane.prototype.receiveMessage = function ( message ) {
    // TODO: Validate this message.
    
    var self = this;
    
    var oldInPermanentUntilMillis = self.inPermanentUntilMillis_;
    
    _.arrEach( message.demands, function ( demand ) {
        var history = new ActivityHistory().init( {
            startMillis: oldInPermanentUntilMillis,
            syncOnAdd: function () {
                // Do nothing.
            },
            syncOnForget: function () {
                // Do nothing.
            }
        } );
        _.arrEach( demand.demandDataHistory, function ( entry ) {
            history.addEntry( entry );
        } );
        self.inDemands_.push( {
            delayMillis: demand.delayMillis,
            demandDataHistory: history
        } );
    } );
    
    // TODO: This triggers syncOnAdd multiple times. See if that's
    // appropriate.
    _.arrEach( message.responses, function ( response ) {
        var entries = response.responseDataHistory;
        if ( entries.length === 0 )
            return;
        var history = self.makeInResponsesHistory_(
            response.delayMillis,
            response.inputData,
            oldInPermanentUntilMillis
        );
        _.arrEach( entries, function ( entry ) {
            history.addEntry( entry );
        } );
    } );
    
    if ( self.inPermanentUntilMillis_ < message.permanentUntilMillis
        ) {
        
        self.inPermanentUntilMillis_ = message.permanentUntilMillis;
        self.inResponsesByDelayAndInput_.asMap().each(
            function ( delayMillis, inResponsesByInput ) {
            
            inResponsesByInput.asMap().each(
                function ( inputData, history ) {
                
                history.suspendData( message.permanentUntilMillis,
                    message.permanentUntilMillis );
            } );
        } );
    }
    
    // Just in case we don't actually have any out-demanders right
    // now, clean up the in-responses.
    self.forgetInResponses_();
    
    if ( message.demands.length !== 0 )
        self.syncOnInDemandAvailable_.call( {} );
};
MessageMembrane.prototype.getInPermanentUntilMillis = function () {
    return this.inPermanentUntilMillis_;
};
MessageMembrane.prototype.getInDemandHistoryEntries = function () {
    // Defensively clone the Arrays.
    return _.arrMap( this.inDemands_, function ( demand ) {
        return {
            delayMillis: demand.delayMillis,
            demandDataHistory:
                demand.demandDataHistory.getAllEntries()
        };
    } );
};
// TODO: See if we can combine the code for
// forgetInDemandBeforeDemandMillis and
// forgetInDemandBeforeResponseMillis. Also, see if we're actually
// going to use forgetInDemandBeforeResponseMillis at some point.
MessageMembrane.prototype.forgetInDemandBeforeDemandMillis =
    function ( demandMillis ) {
    
    var actualForgetDemandMillis =
        Math.min( demandMillis, this.inPermanentUntilMillis_ );
    
    this.inDemands_ = _.arrMappend( this.inDemands_,
        function ( demand ) {
        
        if ( entsEnd( demand.demandDataHistory.getAllEntries() ) <=
            actualForgetDemandMillis )
            return [];
        demand.demandDataHistory.forgetBeforeMillis(
            actualForgetDemandMillis );
        return [ { delayMillis: demand.delayMillis,
            demandDataHistory: demand.demandDataHistory } ];
    } );
};
MessageMembrane.prototype.forgetInDemandBeforeResponseMillis =
    function ( responseMillis ) {
    
    var actualForgetResponseMillis =
        Math.min( responseMillis, this.inPermanentUntilMillis_ );
    
    this.inDemands_ = _.arrMappend( this.inDemands_,
        function ( demand ) {
        
        var actualForgetDemandMillis =
            actualForgetResponseMillis - demand.delayMillis;
        if ( entsEnd( demand.demandDataHistory.getAllEntries() ) <=
            actualForgetDemandMillis )
            return [];
        demand.demandDataHistory.forgetBeforeMillis(
            actualForgetDemandMillis );
        return [ { delayMillis: demand.delayMillis,
            demandDataHistory: demand.demandDataHistory } ];
    } );
};
MessageMembrane.prototype.raiseOtherOutPermanentUntilMillis =
    function ( otherOutPermanentUntilMillis ) {
    
    var self = this;
    
    if ( !isValidTime( otherOutPermanentUntilMillis ) )
        throw new Error();
    if ( otherOutPermanentUntilMillis <=
        self.otherOutPermanentUntilMillis_ )
        return;
    
    self.otherOutPermanentUntilMillis_ = otherOutPermanentUntilMillis;
    self.updateInResponseIgnoranceMillis_();
    self.outResponsesByDelayAndInput_.asMap().each(
        function ( delayKey, outResponsesByInput ) {
        
        outResponsesByInput.asMap().each(
            function ( inputKey, history ) {
            
            history.suspendData( otherOutPermanentUntilMillis,
                otherOutPermanentUntilMillis );
        } );
    } );
    self.triggerSendMessage_();
};
// NOTE: Unlike an out-demander's {set,suspend,finish}Demand methods
// and an ActivityHistory's {set,suspend,finish}Data methods, there is
// no corresponding finishOutResponse here to complete the set. That's
// because a finished out-response could never be garbage-collected,
// but an outdated one can.
MessageMembrane.prototype.setOutResponse = function (
    delayMillis, inDemandData,
    outResponseData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).setData( outResponseData, startMillis, endMillis );
    this.triggerSendMessage_();
};
MessageMembrane.prototype.suspendOutResponse = function (
    delayMillis, inDemandData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).suspendData( startMillis, endMillis );
    this.triggerSendMessage_();
};
MessageMembrane.prototype.forgetInResponses_ = function () {
    var self = this;
    self.inResponsesByDelayAndInput_.asMap().each(
        function ( delayMillis, inResponsesByInput ) {
        
        inResponsesByInput.asMap().each(
            function ( inputData, history ) {
            
            history.forgetBeforeMillis(
                self.inResponseIgnoranceMillis_ );
        } );
    } );
};
MessageMembrane.prototype.getNewOutDemander = function (
    outPermanentUntilMillis, delayMillis, syncOnResponseAvailable ) {
    
    var self = this;
    
    if ( !(isValidTime( outPermanentUntilMillis )
        && isValidDuration( delayMillis )) )
        throw new Error();
    
    var actualOutPermanentUntilMillis = Math.max(
        outPermanentUntilMillis, self.otherOutPermanentUntilMillis_ );
    
    var demandHistory = new ActivityHistory().init( {
        startMillis: actualOutPermanentUntilMillis,
        syncOnAdd: function () {
            self.triggerSendMessage_();
        },
        syncOnForget: function () {
            // Do nothing.
        }
    } );
    var responseHistory = new ActivityHistory().init( {
        startMillis: actualOutPermanentUntilMillis + delayMillis,
        syncOnAdd: function () {
            syncOnResponseAvailable();
        },
        syncOnForget: function () {
            self.updateInResponseIgnoranceMillis_();
            self.forgetInResponses_();
        }
    } );
    
    var maybeUnsentStartMillis =
        { val: actualOutPermanentUntilMillis };
    
    function forgetResponseBeforeResponseMillis( responseMillis ) {
        responseHistory.forgetBeforeMillis( responseMillis );
        demandHistory.forgetBeforeMillis( Math.min(
            maybeUnsentStartMillis === null ?
                1 / 0 : maybeUnsentStartMillis.val,
            responseMillis - delayMillis,
            responseHistory.getAllEntries()[ 0 ].startMillis -
                delayMillis
        ) );
    }
    
    var backstage = {};
    backstage.getDelayMillis = function () {
        return delayMillis;
    };
    backstage.getDemandHistoryEntries = function () {
        return demandHistory.getAllEntries();
    };
    backstage.readDemandHistoryEntries = function () {
        if ( maybeUnsentStartMillis === null )
            return null;
        var result = demandHistory.getAllEntries().slice();
        // TODO: See if this can be more efficient.
        while ( result[ 0 ].maybeEndMillis !== null
            && result[ 0 ].maybeEndMillis.val <
                maybeUnsentStartMillis.val )
            result.shift();
        maybeUnsentStartMillis =
            result[ result.length - 1 ].maybeEndMillis;
        return result;
    };
    backstage.isScrappable = function () {
        if ( maybeUnsentStartMillis !== null )
            return false;
        var ents = demandHistory.getAllEntries();
        // Return whether we've had responses up to at least the
        // starting point of our eternal inactivity.
        return ents[ ents.length - 1 ].startMillis + delayMillis <=
            entsEnd( responseHistory.getAllEntries() );
    };
    backstage.getResponseHistoryEntries = function () {
        return responseHistory.getAllEntries();
    };
    backstage.addResponseHistoryEntry = function ( historyEntry ) {
        responseHistory.addEntry( historyEntry );
    };
    self.outDemanders_.push( backstage );
    
    responseHistory.addEntry( {
        maybeData: null,
        startMillis: self.inPermanentUntilMillis_,
        maybeEndMillis: { val: self.inPermanentUntilMillis_ }
    } );
    
    var frontstage = {};
    frontstage.getResponseHistoryEntries = function () {
        return responseHistory.getAllEntries();
    };
    frontstage.forgetResponseBeforeDemandMillis = function (
        demandMillis ) {
        
        forgetResponseBeforeResponseMillis(
            demandMillis + delayMillis );
    };
    frontstage.forgetResponseBeforeResponseMillis = function (
        responseMillis ) {
        
        forgetResponseBeforeResponseMillis( responseMillis );
    };
    frontstage.setDemand = function ( data, startMillis, endMillis ) {
        demandHistory.setData( data, startMillis, endMillis );
    };
    frontstage.suspendDemand = function ( startMillis, endMillis ) {
        demandHistory.suspendData( startMillis, endMillis );
    };
    frontstage.finishDemand = function ( startMillis ) {
        demandHistory.finishData( startMillis );
    };
    return frontstage;
};


// Here's the entire MessageMembrane interface, for reference:
//
// MessageMembrane.prototype.init = function (
//     outPermanentUntilMillis, deferForBatching, sendMessage,
//     syncOnInDemandAvailable )
// MessageMembrane.prototype.receiveMessage = function ( message )
// MessageMembrane.prototype.getInPermanentUntilMillis = function ()
// MessageMembrane.prototype.getInDemandHistoryEntries = function ()
// MessageMembrane.prototype.forgetInDemandBeforeResponseMillis =
//     function ( responseMillis )
// MessageMembrane.prototype.raiseOtherOutPermanentUntilMillis =
//     function ( otherOutPermanentUntilMillis )
// MessageMembrane.prototype.setOutResponse = function (
//     delayMillis, inDemandData,
//     outResponseData, startMillis, endMillis )
// MessageMembrane.prototype.suspendOutResponse = function (
//     delayMillis, inDemandData, startMillis, endMillis )
// MessageMembrane.prototype.getNewOutDemander = function (
//     outPermanentUntilMillis, delayMillis, syncOnResponseAvailable
//     ) {
//     
//     var frontstage = {};
//     frontstage.getResponseHistoryEntries = function ()
//     frontstage.forgetResponseBeforeDemandMillis = function (
//         demandMillis )
//     frontstage.forgetResponseBeforeResponseMillis = function (
//         responseMillis )
//     frontstage.setDemand = function (
//         data, startMillis, endMillis )
//     frontstage.suspendDemand = function ( startMillis, endMillis )
//     frontstage.finishDemand = function ( startMillis )
//     return frontstage;
// };


function makeLinkedMembranePair(
    outPermanentUntilMillis, deferForBatching ) {
    
    var aListeners = [];
    var aMembrane = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching,
        function ( message ) {  // sendMessage
            bMembrane.receiveMessage( message );
        },
        function () {  // syncOnInDemandAvailable
            _.arrEach( aListeners, function ( listener ) {
                listener();
            } );
        } );
    
    var bListeners = [];
    var bMembrane = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching,
        function ( message ) {  // sendMessage
            aMembrane.receiveMessage( message );
        },
        function () {  // syncOnInDemandAvailable
            _.arrEach( bListeners, function ( listener ) {
                listener();
            } );
        } );
    
    return {
        a: {
            membrane: aMembrane,
            syncOnInDemandAvailable: function ( listener ) {
                aListeners.push( listener );
            }
        },
        b: {
            membrane: bMembrane,
            syncOnInDemandAvailable: function ( listener ) {
                bListeners.push( listener );
            }
        }
    };
}

function makeLinkedSigPair( startMillis ) {
    
    var listeners = [];
    var history = new ActivityHistory().init( {
        startMillis: startMillis,
        syncOnAdd: function () {
            _.arrEach( listeners, function ( listener ) {
                listener();
            } );
        },
        syncOnForget: function () {
            // Do nothing.
        }
    } );
    
    
    var readable = {};
    readable.syncOnAdd = function ( listener ) {
        listeners.push( listener );
    };
    readable.readEachEntry = function ( processEntry ) {
        // NOTE: This is a convenience method.
        readable.syncOnAdd( function () {
            var entries = readable.history.getAllEntries();
            readable.history.forgetBeforeMillis( entsEnd( entries ) );
            _.arrEach( entries, function ( entry ) {
                processEntry( entry );
            } );
        } );
    };
    readable.history = history;
    
    var writable = {};
    writable.history = history;
    
    return { readable: readable, writable: writable };
}

function getAndForgetDemanderResponse( demander ) {
    var responseEntries = demander.getResponseHistoryEntries();
    var responseEndMillis = entsEnd( responseEntries );
    demander.forgetResponseBeforeResponseMillis(
        responseEndMillis === 1 / 0 ?
            responseEntries[
                responseEntries.length - 1 ].startMillis :
            responseEndMillis );
    return responseEntries;
}

function explicitlyIgnoreMembraneDemand(
    membrane, opt_backlogMillis ) {
    
    _.arrEach( membrane.getInDemandHistoryEntries(),
        function ( demand ) {
        
        var delayMillis = demand.delayMillis;
        _.arrEach( demand.demandDataHistory, function ( entry ) {
            if ( entry.maybeData === null )
                return;
            var data = entry.maybeData.val;
            
            // Respond with a dummy value.
            membrane.setOutResponse( delayMillis, data, [],
                entry.startMillis + delayMillis,
                entry.maybeEndMillis.val + delayMillis );
        } );
    } );
    membrane.forgetInDemandBeforeDemandMillis( Math.min(
        membrane.getInPermanentUntilMillis(),
        opt_backlogMillis === void 0 ? 1 / 0 : opt_backlogMillis
    ) );
}

// TODO: See if we're ever going to use this, now that we have
// behMouseQuery(). Currently we use this to test, and in the future
// it might come in handy for modeling this effect as a resource.
function connectMouseQuery( pairHalf ) {
    var mousePosition = JSON.stringify( null );
    _.appendDom( window, { mousemove: function ( e ) {
        mousePosition = JSON.stringify( [ e.clientX, e.clientY ] );
    } } );
    var responsesToGive = [];
    pairHalf.syncOnInDemandAvailable( function () {
        var nowMillis = new Date().getTime();
        var permanentUntilMillis =
            pairHalf.membrane.getInPermanentUntilMillis();
        _.arrEach( pairHalf.membrane.getInDemandHistoryEntries(),
            function ( demand ) {
            
            var delayMillis = demand.delayMillis;
            _.arrEach( demand.demandDataHistory, function ( entry ) {
                if ( entry.maybeData === null )
                    return;
                var data = entry.maybeData.val;
                var json = void 0;
                
                if ( _.isString( data ) )
                    try { json = JSON.parse( data ); } catch ( e ) {}
                
                if ( true
                    && _.isNumber( json )
                    && json === ~~json
                    && 1 / json !== -1 / 0
                ) {
                    responsesToGive.push( {
                        delayMillis: delayMillis,
                        demandData: data,
                        postMeasurementDelayMillis:
                            delayMillis - json,
                        responseStartMillis:
                            entry.startMillis + delayMillis,
                        responseEndMillis:
                            entry.maybeEndMillis.val + delayMillis
                    } );
                } else {
                    // We don't recognize this message. Respond with a
                    // dummy value.
                    pairHalf.membrane.setOutResponse(
                        delayMillis,
                        data,
                        [],
                        entry.startMillis + delayMillis,
                        entry.maybeEndMillis.val + delayMillis );
                }
            } );
        } );
        pairHalf.membrane.forgetInDemandBeforeDemandMillis(
            Math.min( permanentUntilMillis, nowMillis ) );
    } );
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 100;  // 10;
    var stabilityMillis = 500;  // 200;
    setInterval( function () {
        var measurementStartMillis = new Date().getTime();
        var measurementEndMillis =
            measurementStartMillis + stabilityMillis;
        
        var forLater = [];
        var forRightNow = [];
        _.arrEach( responsesToGive, function ( rtg ) {
            var pmdm = rtg.postMeasurementDelayMillis;
            
            // If we need to give a response before this measurement,
            // give a blank one.
            if ( rtg.responseStartMillis <
                measurementStartMillis + pmdm )
                forRightNow.push( {
                    startMillis: rtg.responseStartMillis,
                    go: function () {
                        pairHalf.membrane.setOutResponse(
                            rtg.delayMillis,
                            rtg.demandData,
                            JSON.stringify( null ),
                            rtg.responseStartMillis,
                            Math.min( measurementStartMillis + pmdm,
                                rtg.responseEndMillis ) );
                    }
                } );
            
            // If we need to give a response during this measurement,
            // give the value of this measurement.
            var thisResponseStartMillis =
                Math.max( measurementStartMillis + pmdm,
                    rtg.responseStartMillis );
            var thisResponseEndMillis =
                Math.min( measurementEndMillis + pmdm,
                    rtg.responseEndMillis );
            if ( thisResponseStartMillis < thisResponseEndMillis )
                forRightNow.push( {
                    startMillis: thisResponseStartMillis,
                    go: function () {
                        pairHalf.membrane.setOutResponse(
                            rtg.delayMillis,
                            rtg.demandData,
                            mousePosition,
                            thisResponseStartMillis,
                            thisResponseEndMillis );
                    }
                } );
            
            // If we need to give a response after this measurement,
            // put that off until later.
            if ( measurementEndMillis + pmdm < rtg.responseEndMillis )
                forLater.push( {
                    delayMillis: rtg.delayMillis,
                    demandData: rtg.demandData,
                    postMeasurementDelayMillis:
                        rtg.postMeasurementDelayMillis,
                    responseStartMillis:
                        Math.max( measurementEndMillis + pmdm,
                            rtg.responseStartMillis ),
                    responseEndMillis: rtg.responseEndMillis
                } );
        } );
        _.arrEach( forRightNow.sort( function ( a, b ) {
            return a.startMillis - b.startMillis;
        } ), function ( frn ) {
            frn.go();
        } );
        responsesToGive = forLater;
        
        pairHalf.membrane.raiseOtherOutPermanentUntilMillis(
            measurementStartMillis );
    }, intervalMillis );
}

function promoteDemanderResponseToOutResponse(
    delayMillis, demander, membrane ) {
    
    _.arrEach( getAndForgetDemanderResponse( demander ),
        function ( entry ) {
        
        if ( entry.maybeData === null )
            ;  // Do nothing.
        else if ( entry.maybeData.val.length === 1 )
            membrane.suspendOutResponse(
                delayMillis,
                entry.maybeData.val[ 0 ],
                entry.startMillis,
                entry.maybeEndMillis.val );
        else
            membrane.setOutResponse(
                delayMillis,
                entry.maybeData.val[ 0 ],
                entry.maybeData.val[ 1 ],
                entry.startMillis,
                entry.maybeEndMillis.val );
    } );
}

if ( Math.min( 3, 2, 1 ) !== 1 )
    throw new Error();

function linkMouseQuery( inSig, outSig ) {
    var mousePosition = JSON.stringify( null );
    _.appendDom( window, { mousemove: function ( e ) {
        mousePosition = JSON.stringify( [ e.clientX, e.clientY ] );
    } } );
    var responsesToGive = [];
    inSig.readEachEntry( function ( entry ) {
        if ( entry.maybeEndMillis.val <= entry.startMillis ) {
            // Don't bother queuing this response-to-give.
            return;
        }
        responsesToGive.push( {
            active: entry.maybeData !== null,
            startMillis: entry.startMillis,
            maybeEndMillis: entry.maybeEndMillis
        } );
        handleInactive();
    } );
    function handleInactive() {
        while ( responsesToGive.length !== 0 ) {
            var rtg = responsesToGive[ 0 ];
            if ( rtg.active )
                break;
            outSig.history.addEntry( {
                maybeData: null,
                startMillis: rtg.startMillis,
                maybeEndMillis: rtg.maybeEndMillis
            } );
            responsesToGive.shift();
        }
    }
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 100;  // 10;
    var stabilityMillis = 500;  // 200;
    setInterval( function () {
        var startToSendMillis = new Date().getTime();
        var endToSendMillis = startToSendMillis + stabilityMillis;
        
        while ( true ) {
            handleInactive();
            if ( responsesToGive.length === 0 ) {
                // TODO: We have a mouse measurement, but the program
                // logic hasn't gotten far enough along to request it
                // yet. See if we should store this mouse measurement
                // and use it when the program gets to that point.
                break;
            }
            
            // If the measured interval is too early for the next
            // requested measurement, we're done responding for now.
            if ( endToSendMillis < responsesToGive[ 0 ].startMillis )
                break;
            
            var rtg = responsesToGive.shift();
            
            // If the requested measurement is earlier than the
            // measured interval, just apologize.
            if ( rtg.maybeEndMillis.val < startToSendMillis ) {
                outSig.history.setData( JSON.stringify( null ),
                    rtg.startMillis, rtg.maybeEndMillis.val );
                continue;
            }
            
            var thisStartToSendMillis =
                Math.max( rtg.startMillis, startToSendMillis );
            var thisEndToSendMillis =
                Math.min( rtg.maybeEndMillis.val, endToSendMillis );
            outSig.history.setData( JSON.stringify( null ),
                rtg.startMillis, thisStartToSendMillis );
            outSig.history.setData( mousePosition,
                thisStartToSendMillis, thisEndToSendMillis );
            if ( endToSendMillis < rtg.maybeEndMillis.val ) {
                responsesToGive.unshift( {
                    active: true,
                    startMillis: endToSendMillis,
                    maybeEndMillis: rtg.maybeEndMillis
                } );
                break;
            }
        }
    }, intervalMillis );
}
function linkDomDiagnostic( inSig, outSig ) {
    var display = _.dom( "div", JSON.stringify( null ) );
    var displayedMillis = -1 / 0;
    inSig.readEachEntry( function ( entry ) {
        
        setTimeout( function () {
            
            // In case the setTimeout calls get out of order, don't
            // display this value.
            if ( entry.startMillis < displayedMillis )
                return;
            displayedMillis = entry.startMillis;
            
            _.dom( display, JSON.stringify( entry.maybeData ) );
            
        }, entry.startMillis - new Date().getTime() );
        
        outSig.history.addEntry( entry );
    } );
    return { dom: display };
}

function makeTestForDemandOverLinkedPair() {
    var now = new Date().getTime();
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    
    var displayDom = _.dom( "div" );
    
    var pairDelayMillis = 1000;
    var mousePosition = JSON.stringify( null );
    _.appendDom( window, { mousemove: function ( e ) {
        mousePosition = JSON.stringify( [ e.clientX, e.clientY ] );
    } } );
    var mouseHistory = new ActivityHistory().init( {
        startMillis: now,
        syncOnAdd: function () {
            // Do nothing.
        },
        syncOnForget: function () {
            // Do nothing.
        }
    } );
    
    var pair = makeLinkedMembranePair( now, deferForBatching );
    pair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( pair.a.membrane );
    } );
    pair.b.syncOnInDemandAvailable( function () {
        var permanentUntilMillis =
            pair.b.membrane.getInPermanentUntilMillis();
        _.arrEach( pair.b.membrane.getInDemandHistoryEntries(),
            function ( demand ) {
            
            var delayMillis = demand.delayMillis;
            if ( delayMillis !== pairDelayMillis )
                return;
            _.arrEach( demand.demandDataHistory, function ( entry ) {
                if ( entry.maybeData === null )
                    return;
                var data = entry.maybeData.val;
                
                var endMillis = Math.min( entEnd( entry ),
                    permanentUntilMillis );
                if ( endMillis < entry.startMillis )
                    return;
                
                mouseHistory.setData(
                    data,
                    entry.startMillis + delayMillis,
                    endMillis + delayMillis );
            } );
        } );
        explicitlyIgnoreMembraneDemand( pair.b.membrane );
    } );
    var aDemander = pair.a.membrane.getNewOutDemander(
        now, pairDelayMillis,
        function () {  // syncOnResponseAvailable
            // Do nothing with the responses except forget them.
            getAndForgetDemanderResponse( aDemander );
        } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    var otherOutStabilityMillis = 1000000;
    setInterval( function () {
        var now = new Date().getTime();
        
        aDemander.setDemand(
            mousePosition, now, now + stabilityMillis );
        pair.a.membrane.raiseOtherOutPermanentUntilMillis(
            now + otherOutStabilityMillis );
        pair.b.membrane.raiseOtherOutPermanentUntilMillis(
            now + otherOutStabilityMillis );
        
        mouseHistory.forgetBeforeMillis( now );
        _.dom( displayDom, JSON.stringify(
            mouseHistory.getAllEntries()[ 0 ].maybeData ) );
    }, intervalMillis );
    
    var result = {};
    result.dom = displayDom;
    return result;
}

function makeTestForResponseOverLinkedPair() {
    var now = new Date().getTime();
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    
    var displayDom = _.dom( "div" );
    
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var pairDelayMillis = 2000;
    var measurementDelayMillis = pairDelayMillis / 2;
    var mouseHistory = new ActivityHistory().init( {
        startMillis: now,
        syncOnAdd: function () {
            // Do nothing.
        },
        syncOnForget: function () {
            // Do nothing.
        }
    } );
    
    var pair = makeLinkedMembranePair( now, deferForBatching );
    connectMouseQuery( pair.b );
    pair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( pair.a.membrane );
    } );
    var aDemander = pair.a.membrane.getNewOutDemander(
        now, pairDelayMillis,
        function () {  // syncOnResponseAvailable
            var nowMillis = new Date().getTime();
            _.arrEach( getAndForgetDemanderResponse( aDemander ),
                function ( entry ) {
                
                // Pretend we didn't get this response until the time
                // it's actually scheduled for.
                setTimeout( next, entry.startMillis - nowMillis );
                function next() {
                    mouseHistory.addEntry( {
                        maybeData:
                            entry.maybeData === null ||
                                entry.maybeData.val.length === 1 ?
                                null :
                                { val: entry.maybeData.val[ 1 ] },
                        startMillis:
                            entry.startMillis - pairDelayMillis +
                                measurementDelayMillis,
                        maybeEndMillis:
                            entry.maybeEndMillis === null ?
                                null :
                                { val: entry.maybeEndMillis.val
                                    - pairDelayMillis
                                    + measurementDelayMillis }
                    } );
                }
            } );
        } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    var otherOutStabilityMillis = 1000000;
    setInterval( function () {
        var nowMillis = new Date().getTime();
        
        aDemander.setDemand( JSON.stringify( measurementDelayMillis ),
            nowMillis, nowMillis + stabilityMillis );
        pair.a.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
        
        mouseHistory.forgetBeforeMillis(
            nowMillis - measurementDelayMillis );
        _.dom( displayDom, JSON.stringify(
            mouseHistory.getAllEntries()[ 0 ].maybeData ) );
    }, intervalMillis );
    
    var result = {};
    result.dom = displayDom;
    return result;
}


// TODO: See if we actually want to model resources in terms of
// MessageMembranes like this.
function UselessResource() {}
UselessResource.prototype.init = function (
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    self.clientMembrane_ = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var demandEntries =
                self.clientMembrane_.getInDemandHistoryEntries();
            
            _.arrEach( demandEntries, function ( demand ) {
                var delayMillis = demand.delayMillis;
                _.arrEach( demand.demandDataHistory,
                    function ( entry ) {
                    
                    if ( entry.maybeData === null )
                        return;
                    var data = entry.maybeData.val;
                    
                    if ( false ) {
                    } else {
                        // TODO: Support meta-messages like
                        // [ "isScrappable" ] and [ "shutDown" ] to
                        // support garbage collection and graceful
                        // shutdown.
                        
                        // We don't recognize this message. Respond
                        // with a dummy value.
                        self.clientMembrane_.setOutResponse(
                            delayMillis,
                            data,
                            [],
                            entry.startMillis + delayMillis,
                            entry.maybeEndMillis.val + delayMillis );
                    }
                } );
            } );
            explicitlyIgnoreMembraneDemand( self.clientMembrane_ );
        } );
    return self;
};
UselessResource.prototype.receiveMessage = function ( message ) {
    this.clientMembrane_.receiveMessage( message );
};

// TODO: See if we actually want to model resources in terms of
// MessageMembranes like this.
function DispatcherResource() {}
DispatcherResource.prototype.init = function ( makeResource,
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    var resources = new ElasticMap().init( {
        keyHash: function ( discriminator ) {
            return dataHash( discriminator );
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return dataIsoAssumingHashIso( a, b );
        },
        retractVal: function ( resource ) {
            return false;
        },
        makeVal: function (
            discriminator, inAndOutPermanentUntilMillis ) {
            
            var resourceMembrane = new MessageMembrane().init(
                inAndOutPermanentUntilMillis, deferForBatching,
                function ( message ) {
                    resource.receiveMessage( message );
                },
                function () {  // syncOnInDemandAvailable
                    
                    // Send the resource's demand to the client.
                    
                    var permanentUntilMillis =
                        resourceMembrane.getInPermanentUntilMillis();
                    _.arrEach(
                        resourceMembrane.getInDemandHistoryEntries(),
                        function ( demand ) {
                        
                        var delayMillis = demand.delayMillis;
                        var demandEntries = demand.demandDataHistory;
                        var startMillis =
                            demandEntries[ 0 ].startMillis;
                        var demander =
                            self.clientMembrane_.getNewOutDemander(
                            startMillis, delayMillis,
                            function () {  // syncOnResponseAvailable
                            
                            // Send the client's response back to
                            // the resource.
                            promoteDemanderResponseToOutResponse(
                                delayMillis,
                                demander,
                                resourceMembrane );
                        } );
                        _.arrEach( demandEntries, function ( entry ) {
                            // TODO: See if we actually need the
                            // messages to contain "maybeEndMillis"
                            // instead of just "endMillis".
                            if ( entry.maybeEndMillis === null )
                                return;
                            if ( entry.maybeData === null )
                                demander.suspendDemand(
                                    entry.startMillis,
                                    entry.maybeEndMillis.val );
                            else
                                demander.setDemand(
                                    [ discriminator,
                                        entry.maybeData.val ],
                                    entry.startMillis,
                                    entry.maybeEndMillis.val );
                        } );
                        demander.finishDemand( startMillis );
                    } );
                    resourceMembrane.forgetInDemandBeforeDemandMillis(
                        permanentUntilMillis );
                } );
            var resource = makeResource.call( {},
                discriminator,
                inAndOutPermanentUntilMillis,
                deferForBatching,
                function ( message ) {
                    resourceMembrane.receiveMessage( message );
                } );
            return resource;
        }
    } );
    
    self.clientMembrane_ = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var permanentUntilMillis =
                self.clientMembrane_.getInPermanentUntilMillis();
            _.arrEach(
                self.clientMembrane_.getInDemandHistoryEntries(),
                function ( demand ) {
                
                var delayMillis = demand.delayMillis;
                var resourceDemanders = new ElasticMap().init( {
                    keyHash: function ( discriminator ) {
                        return dataHash( inputData );
                    },
                    keyIsoAssumingHashIso: function ( a, b ) {
                        return dataIsoAssumingHashIso( a, b );
                    },
                    retractVal: function ( resourceDemander ) {
                        return false;
                    },
                    makeVal: function ( discriminator, startMillis ) {
                        var demander = resources.getOrMake(
                            discriminator, startMillis
                        ).getNewOutDemander( startMillis, delayMillis,
                            function () {  // syncOnResponseAvailable
                            
                            // Send the resource's response back to
                            // the client.
                            promoteDemanderResponseToOutResponse(
                                delayMillis,
                                demander,
                                self.clientMembrane_ );
                        } );
                        return {
                            demander: demander,
                            endMillis: startMillis
                        };
                    }
                } );
                _.arrEach( demand.demandDataHistory,
                    function ( entry ) {
                    
                    if ( entry.maybeData === null )
                        return;
                    var data = entry.maybeData.val;
                    
                    if ( true
                        && _.likeArray( data )
                        && data.length === 2
                        && data[ 0 ] === "passthrough"
                        && _.likeArray( data[ 1 ] )
                        && data[ 1 ].length === 2
                    ) {
                        // Send the client's demand to the appropriate
                        // resource.
                        
                        var demander = resourceDemanders.getOrMake(
                            data[ 1 ][ 0 ], entry.startMillis );
                        demander.demander.setDemand(
                            [ "passthrough", data[ 1 ][ 1 ] ],
                            entry.startMillis,
                            entry.maybeEndMillis.val
                        );
                        demander.endMillis = Math.max(
                            demander.endMillis,
                            entry.maybeEndMillis.val );
                    } else {
                        // TODO: Support meta-messages like
                        // [ "isScrappable" ] and [ "shutDown" ] to
                        // support garbage collection and graceful
                        // shutdown.
                        
                        // We don't recognize this message. Respond
                        // with a dummy value.
                        self.clientMembrane_.setOutResponse(
                            delayMillis,
                            data,
                            [],
                            entry.startMillis + delayMillis,
                            entry.maybeEndMillis.val + delayMillis );
                    }
                } );
                resourceDemanders.asMap().each(
                    function ( discriminator, demander ) {
                    
                    demander.demander.finishDemand(
                        demander.endMillis );
                } );
            } );
            self.clientMembrane_.forgetInDemandBeforeDemandMillis(
                permanentUntilMillis );
        } );
    return self;
};
DispatcherResource.prototype.receiveMessage = function ( message ) {
    this.clientMembrane_.receiveMessage( message );
};
