Underreact
==========

I'm trying to build a framework for continuous reactive programming,
particularly David Barbour's model "RDP" (Reactive Demand
Programming), using JavaScript as a platform. This repository
represents a few attempts at that goal.

### The newest attempt

* underreact-dynamic.js
* underreact-dynamic-test.html

I've modeled recursive links, and soon I'm going to need a model of
behaviors and a few useful I/O behaviors to build demo applications
with.

I also have some initial code for state resource spaces, but I haven't
yet decided on interfaces for garbage-collecting and persisting this
state, so for now I'm thinking of forgoing spaces and instead
allocating state on the JavaScript side. If a program is primarily
built out of behaviors, this decision is analogous to using only
statically allocated state.

I expect the design of this system to converge toward David Barbour's
ideals for RDP, but I'm allowing myself to take different paths and do
a bit of experimentation along the way.

### Old attempts

The files "underreact-rdpio.js" and "underreact-test.html" are an old
attempt to port David Barbour's Haskell code directly. I abandoned
this before completing it, mostly because it was too hard to keep up
with the upstream changes.

The file "graphlang.js" is a JavaScript EDSL for constructing
data-control flow graphs, so that the code to build the data-control
flow graph looks vaguely similar to how the same data-control flow
appears in JavaScript itself. This may come in handy for writing RDP
behavior graphs, once some kind of semantics exists for them.
