# Overview

A two step approach has been adopted to answer the requirements. The data file is generated ahead of time with the command `npm run index:data` and then queried by the api

In the database generation phase the process is the following (see `scripts/indexData.js` and `utils/cities.js`):

- get command line params
- load the tsv file at the path given by the user
- going through each cities, retrieving data and generating a canonical version of the name (predictable and without any non significatnt chars, as \_/- and white spaces, see `utils/text => sanititzeString`)

Basically, the process is the following:

- receive a get requests on /suggestions
- validate get params and return an error code if the query is not present OR the coordinates of the reference point is malformed.
- convert the query to a canonical version
- search inside the database of cities for every cities matching the start of the query ( using an index or full trasversal depending on the endpoint)
- assign a weight to each results matching the levenstein distance of the string => 1 differenct chars on 10 total gives a 90% score (`utils/suggestions/index.js => withLevensteinDistanceScore`)
- if a reference point is given (`utils/suggestions/index.js => weighWithGeoDistanceScore`):
  - go through each matched results,
  - compute the distance in km to the reference point
  - sort by ascending distance
  - compute a geo score, based on a distance linear scale (0 is at the center, 1 is at the furthest)
- return the results or a 404 if no data

The high-traffic mitigation is handled by a standard rate-limiter.

# Testing

`npm test` will run the tests. A pragmatic approach is used here: 100% coverage is not the only goal, but rather smarts tests are favored for the main features.

# Performance

## Full list search

`npm run benchmark:prod`

the test case consists of 2500 requests, from 50 virtual users, about 100 RPS.

- take 1, integral list search, without rate limiting and cache:

```
All virtual users finished
Summary report @ 01:13:40(-0500) 2018-12-02
  Scenarios launched:  50
  Scenarios completed: 50
  Requests completed:  2500
  RPS sent: 104.21
  Request latency:
    min: 37.3
    max: 8643.5
    median: 239.9
    p95: 674.1
    p99: 1765.4
  Scenario counts:
    0: 50 (100%)
  Codes:
    200: 2500
```

- the current benchmark will be rate limited and use caching, reducing the max time by 6x.

```
Summary report @ 08:55:12(-0500) 2018-12-03
  Scenarios launched:  50
  Scenarios completed: 50
  Requests completed:  2500
  RPS sent: 55.51
  Request latency:
    min: 45.7
    max: 1572.4
    median: 111.7
    p95: 304.2
    p99: 666.3
  Scenario counts:
    0: 50 (100%)
  Codes:
    200: 2500

Done in 46.09s.

```

## Experimental index

An index approach has been tested and the performance boost is encouraging:

```
$ node --expose-gc scripts/benchmark-list-index.js
benchmark suggester-id-list
suggester-id-list: 519.885ms
benchmark suggester-id-index
suggester-id-index: 55.297ms
Done in 0.97s.
```

You can test it using the `/suggestions-index-nocache` endpoint.

Without cache, here a typical benchmark:

```
yarn benchmark:prod:index:nolimit

Summary report @ 10:59:39(-0500) 2018-12-03
  Scenarios launched:  50
  Scenarios completed: 50
  Requests completed:  2500
  RPS sent: 73.31
  Request latency:
    min: 47.1
    max: 2508
    median: 468.1
    p95: 1377.6
    p99: 2231.5
  Scenario counts:
    0: 50 (100%)
  Codes:
    200: 2500

Done in 35.10s.

```

We reduced the max latency by 4x !!

# Gotchas

- Readable province and states names come from: 'http://www.geonames.org/CA/administrative-division-canada.html'

To reduce time and focus on business logic, the usual `express` and `lodash` has been used.

## Next steps in real-life

This has been designed and done as a thought experiment and some engineer grit show-off.

In real-life, how do we design this system for performance and scale (for instance to support more countries) ?

For small datasets (that fits in ram) with infrequent changes, nothing beats in-memory data co-location. We can deploy our data in object storage and have a lazy download on those data in your application instances. Data will be loaded in memory and available.

For larger datasets and more complex queries, we need to rely on a dedicated datastore and keep our applicative layer stateless.
A read-centric datastore that supports clustering and high throughput would be a great idea.

A well-tuned relational database could do the job for simple text queries with a geomatic extension (PostGIS in Postgres)
If more sophistication (fuzziness in search) is required, we can use a distributed search index with native geo-point support like elasticsearch (https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html). It uses advanced full text search algorithms as BMF-25 and is then versatile.

- cache => done, plug it to a real cache like instance to enable
- Add type system like typescript
- Use a true index to decrease numbers of array traversal => experimental, see benchmarks
