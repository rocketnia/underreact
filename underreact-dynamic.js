// underreact-dynamic.js
// Copyright 2013 Ross Angle. Released under the MIT License.
"use strict";

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
// TODO: Implement a way to construct pairs of linked GlobalLinks at
// the same time. (This will be easy.)
//
// TODO: Implement behavior internal objects. These will typically be
// initialized using a JavaScript function that takes multiple
// GlobalLinks as parameters and then links them together in a custom
// way.
//
// TODO: Implement behaviors, first-class values which can be composed
// to become a larger behavior which ends up orchestrating a network
// of GlobalLink pairs and behavior internal objects. Behaviors may
// have some type-system-like restrictions on how they can be
// composed, or perhaps it would be better to separate that
// restriction system ino its own abstraction layer (and call that
// layer "behaviors" instead of this one).
//
// TODO: Run this code someday.


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
function GlobalLink() {}
GlobalLink.prototype.init = function (
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
        _.arrEach( self.outDemanders_, function ( od ) {
            
            // Update this out-demander with whatever new history
            // entries it's missing.
            
            if ( od.getDelayMillis() !== delayMillis )
                return;
            var demandEntries = od.getDemandHistoryEntries();
            var localResponseEndMillis =
                entsEnd( od.getResponseHistoryEntries() );
            var demI = 0, myResI = 0;
            outer: while ( true ) {
                while (
                    entEnd( demandEntries[ demI ] ) +
                        delayMillis <=
                        localResponseEndMillis ) {
                    
                    demI++;
                    if ( demandEntries.length <= demI )
                        break outer;
                }
                while ( entEnd( myEntries[ myResI ] ) <=
                    localResponseEndMillis ) {
                    
                    myResI++;
                    if ( myEntries.length <= myResI )
                        break outer;
                }
                
                var demandEntry = demandEntries[ demI ];
                var myResponseEntry = myEntries[ myResI ];
                var newLocalResponseEndMillis = Math.min(
                    entEnd( demandEntry ) + delayMillis,
                    entEnd( myResponseEntry ) );
                var newLocalResponseMaybeEndMillis =
                    newLocalResponseEndMillis === 1 / 0 ? null :
                        { val: newLocalResponseEndMillis };
                var maybeLocalResponseData = null;
                if ( demandEntry.maybeData !== null
                    && dataIso(
                        demandEntry.maybeData.val, inputData ) )
                    maybeLocalResponseData =
                        myResponseEntry.maybeData;
                
                od.addResponseHistoryEntry( {
                    maybeData: maybeLocalResponseData,
                    startMillis: localResponseEndMillis,
                    maybeEndMillis: newLocalResponseMaybeEndMillis
                } );
                
                localResponseEndMillis = newLocalResponseEndMillis;
            }
        } );
        self.scrapOutDemanders_();
    }
    
    self.triggerSendMessage_();
    
    return self;
};
GlobalLink.prototype.updateInResponseIgnoranceMillis_ = function () {
    var self = this;
    var self.inResponseIgnoranceMillis_ =
        self.otherOutPermanentUntilMillis_;
    _.arrEach( self.outDemanders_, function ( od ) {
        self.inResponseIgnoranceMillis_ = Math.min(
            self.inResponseIgnoranceMillis_,
            od.getResponseHistoryEntries()[ 0 ].startMillis
        );
    } );
};
GlobalLink.prototype.scrapOutDemanders_ = function () {
    this.outDemanders_ =
        _.arrKeep( this.outDemanders_, function ( od ) {
            return !od.isScrappable();
        } );
    this.updateInResponseIgnoranceMillis_();
};
GlobalLink.prototype.makeOutResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return self.outResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
GlobalLink.prototype.makeInResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return self.inResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
GlobalLink.prototype.triggerSendMessage_ = function () {
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
GlobalLink.prototype.receiveMessage = function ( message ) {
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
            response.demandData,
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
GlobalLink.prototype.getInPermanentUntilMillis = function () {
    return this.inPermanentUntilMillis_;
};
GlobalLink.prototype.getInDemandHistoryEntries = function () {
    // Defensively clone the Arrays.
    return _.arrMap( this.inDemands_, function ( demand ) {
        return {
            delayMillis: demand.delayMillis,
            demandDataHistory:
                demand.demandDataHistory.getAllEntries()
        };
    } );
};
GlobalLink.prototype.forgetInDemandBeforeResponseMillis = function (
    responseMillis ) {
    
    var actualForgetResponseMillis =
        Math.min( responseMillis, this.inPermanentUntilMillis_ );
    
    this.inDemands_ = _.arrMappend( this.inDemands_,
        function ( demand ) {
        
        var forgetDemandMillis =
            actualForgetResponseMillis - demand.delayMillis;
        if ( entsEnd( demand.demandDataHistory.getAllEntries() ) <=
            forgetDemandMillis )
            return [];
        demand.demandDataHistory.forgetBeforeMillis(
            forgetDemandMillis );
        return [ { delayMillis: demand.delayMillis,
            demandDataHistory: demand.demandDataHistory } ];
    } );
};
GlobalLink.prototype.raiseOtherOutPermanentUntilMillis = function (
    otherOutPermanentUntilMillis ) {
    
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
GlobalLink.prototype.setOutResponse = function (
    delayMillis, inDemandData,
    outResponseData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).setData( outResponseData, startMillis, endMillis );
    this.triggerSendMessage_();
};
GlobalLink.prototype.suspendOutResponse = function (
    delayMillis, inDemandData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).suspendData( startMillis, endMillis );
    this.triggerSendMessage_();
};
GlobalLink.prototype.forgetInResponses_ = function () {
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
GlobalLink.prototype.getNewOutDemander = function (
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


// Here's the entire GlobalLink interface, for reference:
//
// GlobalLink.prototype.init = function (
//     outPermanentUntilMillis, deferForBatching, sendMessage,
//     syncOnInDemandAvailable )
// GlobalLink.prototype.receiveMessage = function ( message )
// GlobalLink.prototype.getInPermanentUntilMillis = function ()
// GlobalLink.prototype.getInDemandHistoryEntries = function ()
// GlobalLink.prototype.forgetInDemandBeforeResponseMillis =
//     function ( responseMillis )
// GlobalLink.prototype.raiseOtherOutPermanentUntilMillis = function (
//     otherOutPermanentUntilMillis )
// GlobalLink.prototype.setOutResponse = function (
//     delayMillis, inDemandData,
//     outResponseData, startMillis, endMillis )
// GlobalLink.prototype.suspendOutResponse = function (
//     delayMillis, inDemandData, startMillis, endMillis )
// GlobalLink.prototype.getNewOutDemander = function (
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


function UselessResource() {}
UselessResource.prototype.init = function (
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    self.clientLink_ = new GlobalLink().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var demandEntries =
                self.clientLink_.getInDemandHistoryEntries();
            
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
                        
                        // We don't recognize this demand. Respond
                        // with explicit inactivity.
                        self.clientLink_.suspendOutResponse(
                            delayMillis,
                            data,
                            entry.startMillis + delayMillis,
                            entry.maybeEndMillis.val + delayMillis );
                    }
                } );
            } );
        } );
    return self;
};
UselessResource.prototype.receiveMessage = function ( message ) {
    this.clientLink_.receiveMessage( message );
};

function DispatcherResource() {}
DispatcherResource.prototype.init = function ( makeResource,
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    function promoteDemanderResponseToOutResponse(
        demander, globalLink, demandEntries ) {
        
        var responseEntries = demander.getResponseHistoryEntries();
        var responseEndMillis = entsEnd( responseEntries );
        demander.forgetResponseBeforeResponseMillis(
            responseEndMillis === 1 / 0 ?
                responseEntries[
                    responseEntries.length - 1 ].startMillis :
                responseEndMillis );
        
        var sentMillis = responseEntries[ 0 ].startMillis;
        var demandI = 0;
        var responseI = 0;
        outer: while ( true ) {
            while ( entEnd( demandEntries[ demandI ] ) < sentMillis
                ) {
                
                demandI++;
                if ( demandEntries.length < demandI )
                    break outer;
            }
            while ( entEnd( responseEntries[ responseI ] ) <
                sentMillis ) {
                
                responseI++;
                if ( responseEntries.length < responseI )
                    break outer;
            }
            var demandEntry = demandEntries[ demandI ];
            var responseEntry = responseEntries[ responseI ];
            var nextSentMillis = Math.min(
                entEnd( demandEntry ), entEnd( responseEntry ) );
            // TODO: Put an assertion in here that says if the
            // response has data then the demand must have had data
            // too (or else there'd have been nothing to respond to).
            if ( demandEntry.maybeData === null )
                ;  // Do nothing.
            else if ( responseEntry.maybeData === null )
                globalLink.suspendOutResponse(
                    delayMillis,
                    demandEntry.maybeData.val,
                    sentMillis,
                    nextSentMillis );
            else
                globalLink.setOutResponse(
                    delayMillis,
                    demandEntry.maybeData.val,
                    responseEntry.maybeData.val,
                    sentMillis,
                    nextSentMillis );
            sentMillis = nextSentMillis;
        }
    }
    
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
            
            var resourceLink = new GlobalLink().init(
                inAndOutPermanentUntilMillis, deferForBatching,
                function ( message ) {
                    resource.receiveMessage( message );
                },
                function () {  // syncOnInDemandAvailable
                    
                    // Send the resource's demand to the client.
                    
                    _.arrEach(
                        resourceLink.getInDemandHistoryEntries(),
                        function ( demand ) {
                        
                        var delayMillis = demand.delayMillis;
                        var demandEntries = demand.demandDataHistory;
                        var startMillis =
                            demandEntries[ 0 ].startMillis;
                        var endMillis = startMillis;
                        var demander =
                            self.clientLink_.getNewOutDemander(
                            startMillis, delayMillis,
                            function () {  // syncOnResponseAvailable
                            
                            // Send the client's response back to
                            // the resource.
                            promoteDemanderResponseToOutResponse(
                                demander, resourceLink, demandEntries
                                );
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
                            endMillis = Math.max( endMillis,
                                entry.maybeEndMillis.val );
                        } );
                        demander.finishDemand( endMillis );
                    } );
                } );
            var resource = makeResource.call( {},
                discriminator,
                inAndOutPermanentUntilMillis,
                deferForBatching,
                function ( message ) {
                    resourceLink.receiveMessage( message );
                } );
            return resource;
        }
    } );
    
    self.clientLink_ = new GlobalLink().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var demandEntries =
                self.clientLink_.getInDemandHistoryEntries();
            
            _.arrEach( demandEntries, function ( demand ) {
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
                                demander, self.clientLink_,
                                demandEntries );
                        } );
                        return {
                            demander: demander,
                            endMillis: startMillis
                        };
                    }
                } );
                var delayMillis = demand.delayMillis;
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
                        && data[ 1 ].length === 3
                        && _.isString( data[ 1 ][ 0 ] )
                        && _.isString( data[ 1 ][ 1 ] )
                    ) {
                        // Send the client's demand to the appropriate
                        // resource.
                        
                        var demander = resourceDemanders.getOrMake( [
                            data[ 1 ][ 0 ],
                            data[ 1 ][ 1 ]
                        ], entry.startMillis );
                        demander.demander.setDemand(
                            [ "passthrough", data[ 1 ][ 2 ] ],
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
                        
                        // We don't recognize this demand. Respond
                        // with explicit inactivity.
                        self.clientLink_.suspendOutResponse(
                            delayMillis,
                            data,
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
        } );
    return self;
};
DispatcherResource.prototype.receiveMessage = function ( message ) {
    this.clientLink_.receiveMessage( message );
};
