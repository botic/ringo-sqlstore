# About Ringo SQLstore

Ringo SQLstore is a lightweight ORM/storage implementation for [RingoJS](http://ringojs.org/). It uses JDBC for communication with databases. Current features are:

* Creation of tables and sequences
* Transaction support
* Lazy loading
* One-to-one, one-to-many and many-to-many mappings
* Connection pooling
* Object caching
* Easy SQL-like querying

Currently supported databases are [H2](http://h2database.com), [MySQL (5.x)](http://mysql.com), [Oracle (XE)](http://www.oracle.com/technetwork/products/express-edition/overview/index.html) and [PostgreSQL (8.x)](http://postgresql.org). H2 is part of the package, so you can start right off using it without the hassle of installing and configuring a database.

## Status

Although Ringo SQLstore is pre-1.0, it has been used in production in various applications for several years now. Nevertheless chances are that on the way to version 1.0 there will be incompatible API changes.

## Documentation

Documentation is available at https://github.com/grob/ringo-sqlstore/wiki

## Acknowledgements

SQLstore is heavily inspired by

* [[ringo-hibernate | http://github.com/robi42/ringo-hibernate/]] by Robert Thurnher
* [[Helma | http://helma.org]] (the predecessor of RingoJS)
* [[Hibernate | http://hibernate.org]] Project
