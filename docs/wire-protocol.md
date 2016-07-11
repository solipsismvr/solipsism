Solipsism Wire Protocol
=======================

The recommended communication mechanism for Solipisim is to use a WebSocket connection. Although web sockets distinguish
clients and servers, the Solipsism wire protocol is peer-to-peer: servers, clients, and proxies are distinguished only by
the nodes that they choose to relay.

If you are developing a JavaScript-based app, it will be much easier use the Solipsism library directly. However, if you
are building apps in other platforms, this wire protocol document should give you the information you need.

Re-implementations of GameWorld, GameObject, and the syncing behaviour in other languages would be welcomed!

WebSocket Messages
------------------

WebSocket messages will be JSON-encoded payloads. The root of the message will be a 2 element array:

```js
[ messageType, data ]
```

Message types and the corresponding data is detailed below:

Message types
-------------

 * `worldChange`: The most common message format. This sends changes to the world.
 * `requestRefresh`: Sent by a peer that wants to have all objects in the world re-sent.
 * `requestMetadata`: Sent by a peer that wants to receive a metadata message.
 * `metadata`: Sent in response to `requestMetadata`.


### worldChange

Any changes to the GameWorld that need to be communicated are sent as a worldChange event. The data of this event
is a map containing two keys, timestamp and change. The full message payload will look something like this:

```js
[
  'worldChange',
  {
    timestamp: 1468275353,
    changes: [
      {
        type: 'add',
        id: '2345y789-2345y789',
        owner: 'server-2345y789-2345y789',
        properties: {
          position: [ 1, 2, 3 ],
        }
      },
      {
        type: 'update',
        id: '2345y789-2345y789',
        properties: {
          position: [ 1, 2, 3 ],
        }
      },
      {
        type: 'remove',
        id: '2345y789-2345y789'
      }
    ]
  }
]
```

 * `timestamp`: A unix timestamp when this change event was created, according to the clock of the originating peer.
   Other peers that listen to changes can use irregularities in the receipt times of worldChange events vs their 
   timestamps to perform extrapolation and reduce jitter.
 * `changes:` An array of change records.

Change records are maps with the following keys:

 * `type`: `add`, `update`, or `remove`. Add events that referencing existing objects may be treated as updates.
 * `id`: A UUID of the given object. These are generally of the form XXXXXXXX-XXXXXXXX where X is any alphanumeric
   character. They are case-sensitive.
 * `owner`: The UUID of the GameWorld that owns this object. Each object has a single owner, to assist in
   synchronisation logic. See "GameObject Ownership" below. Only provided on `add` changes.
 * `properties`: A map of GameObject properties to set. Any missing properties are left unchanged. See the main docs
   for more information on the kinds of properties available and their data types.

### requestRefresh

When a peer first connects, it will need to get a fresh sync of the whole GameWorld. Ordinarily, peers will only send
changes, so this needs a special message, `requestRefresh`. It takes no data. Any peers that recieve a requestRefresh
message should send their all relevant objects in their GameWorld as a worldChange event.

### requestMetdata and metadata

Each peer can have some meta-data. Currently the following meta-data keys are recognised, but like HTTP headers,
you could add your own without breaking things.

 * `identifier`: The UUID of the peer GameWorld, as is also used in `owner` values in `worldChange` events. Generally
   of the form `prefix-XXXXXXXX-XXXXXXXX`, where X is any alphanumeric character and prefix is a human-readable
   indicators of what kind of peer it is (e.g. client, webworker, or server).
 * `identifierChain`: An array containing UUID of the peer GameWorld and any other GameWorlds that it is proxying.
  If the peer isn't a proxy, then this should be set to `[ identifier ]`

Because WebSockets are message based and not RPC, the request/response must be coded as 2 separate messages:

A asking for the metadata of B and receiving a response will consist of the following 2 messages:

 * A -> B: `[ 'requestMetadata', null ]`
 * B -> A: `[ 'metadata', { identifier: '2345y789-2345y789', identifierChain: [ '2345y789-2345y789' ] } ]`

Note that if you are building a client and you don't implement `metadata` responses, a server you connect to will
struggle to send you the appropriate GameWorld objects.

GameObject Ownership
--------------------

Every GameObject will have a single GameWorld that is its owner. Right now, expected behaviour is that the GameWorld
that creates a GameObject is that GameObject's owner. This may be refined in the future, with the ability to re-assign
ownership of objects.

The expectation is that the GameWorld that owns  a given GameObject will act as the canoncial source of truth for that
record. Other GameWorlds may extrapolate the object's properties, and servers/proxies may pass the object around to
ensure that everyone sees the same record, but they should be overwritten whenever an update is received from the 
object's owner.

This is an "expectation" rather than a "rule", as each GameWorld peer will decide what kind of change messages it will
emit. The follwing specific synchonisation rules have been implemented on the core solipsism support classes:

 * Clients: Only send changes to objects that I own.
 * Proxies: Only send changes downstream to objects that I or my client own. Only send changes upstream that are not
   owned by my client.
 * Servers: Only send changes to a client that are not owned by that client (or any of its proxies).

The solipisim protocol allows for other approaches. For example, emitted messages could be filtered by location in
order to implement spatial sharding.

Currently, it's expected that message senders implement these rulesm. Adding filtering on the recipient side would make
the protocol more secure, but this is still an early prototype.

Other communication mechanisms
------------------------------

The same message payload is used to communicate between a browser's main thread and any WebWorkers.
