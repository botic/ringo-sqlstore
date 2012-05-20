var {createCacheKey} = require("../cache");
var {Key} = require("../key");

var CollectorGenerator = exports.CollectorGenerator = function(store, aliases) {
    Object.defineProperties(this, {
        "store": {"value": store, "enumerable": true},
        "aliases": {"value": aliases || {}, "enumerable": true}
    });
    return this;
};

CollectorGenerator.prototype.toString = function() {
    return "[CollectorGenerator]";
};

CollectorGenerator.prototype.getEntityMapping = function(name) {
    return this.store.getEntityMapping(this.aliases[name] || name);
};

CollectorGenerator.prototype.visitSelectClause = function(node) {
    if (node.length === 1) {
        return node.get(0).accept(this);
    }
    return node.list.map(function(child) {
        return {
            "property": child.getResultPropertyName(),
            "collector": child.accept(this)
        };
    }, this);
};

CollectorGenerator.prototype.visitSelectAggregation = function(node) {
    return new AggregationCollector(node.getPropertyMapping(this), node);
};

CollectorGenerator.prototype.visitSelectIdent = function(node) {
    return new PropertyCollector(node.getPropertyMapping(this), node);
};

CollectorGenerator.prototype.visitSelectEntity = function(node) {
    return new EntityCollector(node.getEntityMapping(this), node);
};

var EntityCollector = function(mapping, node) {
    Object.defineProperties(this, {
        "mapping": {"value": mapping, "enumerable": true},
        "node": {"value": node, "enumerable": true}
    });
    return this;
};

EntityCollector.prototype.collect = function(resultSet) {
    var store = this.mapping.store;
    var columnIdx = resultSet.findColumn(this.node.getColumnAlias());
    var columnType = store.dialect.getType(this.mapping.id.type);
    var id = columnType.get(resultSet, columnIdx);
    var cacheKey = createCacheKey(this.mapping.type, id);
    var entity = null;
    if (store.isCacheEnabled() && store.cache.containsKey(cacheKey)) {
        entity = store.cache.get(cacheKey);
    } else if (this.node.loadAggressive === true) {
        entity = {
            "_key": new Key(this.mapping.type, id)
        };
        for each (let propMapping in this.mapping.columns) {
            columnIdx = resultSet.findColumn(this.node.getColumnAlias(propMapping.name));
            columnType = store.dialect.getType(propMapping.type);
            entity[propMapping.column] = columnType.get(resultSet, columnIdx);
        }
    }
    return store.create(this.mapping.type, new Key(this.mapping.type, id), entity);
};

var PropertyCollector = function(mapping, node) {
    Object.defineProperties(this, {
        "mapping": {"value": mapping, "enumerable": true},
        "node": {"value": node, "enumerable": true}
    });
    return this;
};

PropertyCollector.prototype.collect = function(resultSet) {
    var store = this.mapping.mapping.store;
    var columnType = store.dialect.getType(this.mapping.type);
    var columnIdx = resultSet.findColumn(this.node.getColumnAlias());
    return columnType.get(resultSet, columnIdx);
};

var AggregationCollector = function(mapping, node) {
    Object.defineProperties(this, {
        "mapping": {"value": mapping, "enumerable": true},
        "node": {"value": node, "enumerable": true}
    });
    return this;
};

AggregationCollector.prototype.collect = function(resultSet) {
    var store = this.mapping.mapping.store;
    // FIXME: is it save to assume datatype "long"?
    var columnType = store.dialect.getType("long");
    var columnIdx = resultSet.findColumn(this.node.getColumnAlias());
    return columnType.get(resultSet, columnIdx);
};