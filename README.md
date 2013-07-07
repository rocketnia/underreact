Underreact
==========

I'm trying to build a framework for continuous reactive programming,
particularly David Barbour's model "RDP" (Reactive Demand
Programming), using JavaScript as a platform. This repository
represents a couple of attempts at that goal.

The files "underreact-rdpio.js" and "underreact-test.html" are an old
attempt to port David Barbour's Haskell code directly. I abandoned
this before completing it, mostly because it was too hard to keep up
with the upstream changes.

The file "graphlang.js" is a JavaScript EDSL for constructing
data-control flow graphs, so that the code to build the data-control
flow graph looks vaguely similar to how the same data-control flow
appears in JavaScript itself. This may come in handy for writing RDP
behavior graphs, once some kind of semantics exists for them.

The file "underreact-dynamic.js" is a new attempt. I've modeled
recursive links and resource spaces, and soon I'm going to need some
actually useful I/O resources and a way to compose continuous-time
abstractions without writing a bunch of discrete-time event-handling
code in between. I expect the design of this system to converge toward
David Barbour's progress on RDP, but I'm allowing myself to do a bit
of experimentation along the way.
