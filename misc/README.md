Underreact /misc/
==========

I'm building a framework for continuous reactive programming,
particularly David Barbour's model "RDP" (Reactive Demand
Programming), using JavaScript as a platform. This repository
represents a few attempts at that goal, some of which didn't get very
far. This directory contains those false starts.

### A port from Haskell

* underreact-rdpio.js
* underreact-rdpio-test.html

This was an attempt to port David Barbour's Haskell code directly. It
was too hard to keep up with the upstream changes, and I hardly
understood very much of the functionality I was trying to replicate,
so I abandoned this attempt.

### Graphlang

* graphlang.js

RDP's first-class entities are not just data values, but streaming
data collections distributed across time and space. Probabilistic RDP
augments this by replacing data with fuzzy data (which could be
represented as probability distributions). Still other programming
models have first-class codata (linear type systems) or first-class
static types (dependent type systems), so I'm interested in a way to
generalize this pattern and program for all these systems at once.

Graphlang is a working name for a syntax that makes it easy to express
arbitrary graphs using a program-like textual syntax. Then the graph
itself could be the source code to support one of these programming
models, so the textual syntax could be developed independently of the
semantic infrastructure.

This graphlang.js file is a JavaScript EDSL for constructing graphs.
It doesn't have any supporting infrastructure at this point, so you
may not have any use for the particular kind of graph it helps you
build.
