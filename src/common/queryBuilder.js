const platforms = ["elastic", "sequelize", "mongodb"];
const Sequelize = require("sequelize");

class ElasticExpression {
  constructor() {
    this.expression = null;
  }
  build() {
    return null;
  }
}

class ElasticEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { term: { [this.r]: { value: this.l } } };
  }
}

class ElasticNotEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    const positiveQuery = { [this.r]: this.l };
    return { bool: { must_not: positiveQuery } };
  }
}

class ElasticGreaterThanExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gt: this.l } } };
  }
}

class ElasticGreaterThanOrEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gte: this.l } } };
  }
}

class ElasticLessThanExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { lt: this.l } } };
  }
}

class ElasticLessThanOrEqualExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { lte: this.l } } };
  }
}

class ElasticInExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { terms: { [this.r]: this.l } };
  }
}

class ElasticNotInExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { terms: { [this.r]: this.l } } } };
  }
}

class ElasticLikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticILikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticNotLikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticNotILikeExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticIsNullExpression extends ElasticExpression {
  constructor(r) {
    super();
    this.r = r;
  }
  build() {
    return { bool: { must_not: { exists: { field: this.r } } } };
  }
}

class ElasticNotNullExpression extends ElasticExpression {
  constructor(r) {
    super();
    this.r = r;
  }
  build() {
    return { exists: { field: this.r } };
  }
}

class ElasticBetweenExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { range: { [this.r]: { gte: this.l[0], lte: this.l[1] } } };
  }
}

class ElasticNotBetweenExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return {
      bool: {
        must_not: { range: { [this.r]: { gte: this.l[0], lte: this.l[1] } } },
      },
    };
  }
}

class ElasticContainsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotContainsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticStartsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { prefix: { [this.r]: this.l } };
  }
}

class ElasticNotStartsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { prefix: { [this.r]: this.l } } } };
  }
}

class ElasticEndsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { wildcard: { [this.r]: this.l } };
  }
}

class ElasticNotEndsExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { wildcard: { [this.r]: this.l } } } };
  }
}

class ElasticMatchExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotMatchExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticOverlapExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { match: { [this.r]: this.l } };
  }
}

class ElasticNotOverlapExpression extends ElasticExpression {
  constructor(r, l) {
    super();
    this.r = r;
    this.l = l;
  }
  build() {
    return { bool: { must_not: { match: { [this.r]: this.l } } } };
  }
}

class ElasticAndExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { must: this.expArray.map((exp) => exp.build()) } };
  }
}

class ElasticOrExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { should: this.expArray.map((exp) => exp.build()) } };
  }
}

class ElasticNotExpression extends ElasticExpression {
  constructor(exp) {
    super();
    this.exp = exp;
  }
  build() {
    return { bool: { must_not: this.exp.build() } };
  }
}

class ElasticNorExpression extends ElasticExpression {
  constructor(expArray) {
    super();
    this.expArray = expArray;
  }
  build() {
    return { bool: { must_not: this.expArray.map((exp) => exp.build()) } };
  }
}

class SequelizeEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: this.l };
  }
}

class SequelizeNotEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.ne]: this.l } };
  }
}

class SequelizeGreaterThanExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.gt]: this.l } };
  }
}

class SequelizeGreaterThanOrEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.gte]: this.l } };
  }
}

class SequelizeLessThanExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.lt]: this.l } };
  }
}

class SequelizeLessThanOrEqualExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.lte]: this.l } };
  }
}

class SequelizeInExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.in]: this.l ?? [] } };
  }
}

class SequelizeNotInExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notIn]: this.l ?? [] } };
  }
}

class SequelizeLikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.like]: this.l } };
  }
}

class SequelizeILikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.iLike]: this.l } };
  }
}

class SequelizeNotLikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notLike]: this.l } };
  }
}

class SequelizeNotILikeExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notILike]: this.l } };
  }
}

class SequelizeIsNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.is]: null } };
  }
}

class SequelizeNotNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.not]: null } };
  }
}

class SequelizeBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.between]: this.l } };
  }
}

class SequelizeNotBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notBetween]: this.l } };
  }
}

class SequelizeContainsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.contains]: this.l } };
  }
}

class SequelizeNotContainsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notContains]: this.l } };
  }
}

class SequelizeStartsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.startsWith]: this.l } };
  }
}

class SequelizeNotStartsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notStartsWith]: this.l } };
  }
}

class SequelizeEndsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.endsWith]: this.l } };
  }
}

class SequelizeNotEndsExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notEndsWith]: this.l } };
  }
}

class SequelizeMatchExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.match]: this.l } };
  }
}

class SequelizeNotMatchExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notMatch]: this.l } };
  }
}

class SequelizeOverlapExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.overlap]: this.l } };
  }
}

class SequelizeNotOverlapExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return { [this.r]: { [Sequelize.Op.notOverlap]: this.l } };
  }
}

class SequelizeAndExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.and]: this.expArray.map((exp) => exp.build()) };
  }
}

class SequelizeOrExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.or]: this.expArray.map((exp) => exp.build()) };
  }
}

class SequelizeNotExpression {
  constructor(exp) {
    this.exp = exp;
  }
  build() {
    return { [Sequelize.Op.not]: this.exp.build() };
  }
}

class SequelizeNorExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return { [Sequelize.Op.not]: this.expArray.map((exp) => exp.build()) };
  }
}

class MongoDbEqualExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: this.r };
  }
}

class MongoDbNotEqualExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $ne: this.r } };
  }
}

class MongoDbGreaterThanExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $gt: this.r } };
  }
}

class MongoDbGreaterThanOrEqualExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $gte: this.r } };
  }
}

class MongoDbLessThanExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $lt: this.r } };
  }
}

class MongoDbLessThanOrEqualExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $lte: this.r } };
  }
}

class MongoDbInExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $in: this.r ?? [] } };
  }
}

class MongoDbNotInExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $nin: this.r ?? [] } };
  }
}

class MongoDbLikeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $regex: new RegExp(this.r), $options: "i" } };
  }
}

class MongoDbNotLikeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $not: new RegExp(this.r), $options: "i" } };
  }
}

class MongoDbILikeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $regex: new RegExp(this.r), $options: "i" } };
  }
}

class MongoDbNotILikeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $not: new RegExp(this.r), $options: "i" } };
  }
}

class MongoDbIsNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: null };
  }
}

class MongoDbNotNullExpression {
  constructor(r) {
    this.r = r;
  }
  build() {
    return { [this.r]: { $ne: null } };
  }
}

class MongoDbBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return {
      [this.r]: {
        $gte: this.l[0],
        $lte: this.l[1],
      },
    };
  }
}

class MongoDbNotBetweenExpression {
  constructor(r, l) {
    this.r = r;
    this.l = l;
  }
  build() {
    return {
      [this.r]: {
        $not: {
          $gte: this.l[0],
          $lte: this.l[1],
        },
      },
    };
  }
}

class MongoDbContainsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $elemMatch: { $eq: this.r } } };
  }
}

class MongoDbNotContainsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $elemMatch: { $eq: this.r } } },
    };
  }
}

class MongoDbStartsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $regex: new RegExp("^" + this.r) } };
  }
}

class MongoDbNotStartsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $regex: new RegExp("^" + this.r) } },
    };
  }
}

class MongoDbEndsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $regex: new RegExp(this.r + "$") } };
  }
}

class MongoDbNotEndsExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $regex: new RegExp(this.r + "$") } },
    };
  }
}

class MongoDbMatchExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $regex: new RegExp(this.r) } };
  }
}

class MongoDbNotMatchExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $regex: new RegExp(this.r) } },
    };
  }
}

class MongoDbOverlapExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $elemMatch: { $in: this.r } } };
  }
}

class MongoDbNotOverlapExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $elemMatch: { $in: this.r } } },
    };
  }
}

class MongoDbAndExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return {
      $and: this.expArray.map((exp) => (exp?.build ? exp.build() : exp)),
    };
  }
}

class MongoDbOrExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return {
      $or: this.expArray.map((exp) => (exp?.build ? exp.build() : exp)),
    };
  }
}

class MongoDbNotExpression {
  constructor(exp) {
    this.exp = exp;
  }
  build() {
    return {
      $not: this.exp?.build ? this.exp.build() : this.exp,
    };
  }
}

class MongoDbNorExpression {
  constructor(expArray) {
    this.expArray = expArray;
  }
  build() {
    return {
      $nor: this.expArray.map((exp) => (exp?.build ? exp.build() : exp)),
    };
  }
}

class MongoDbExistsExpression {
  constructor(l) {
    this.l = l;
  }
  build() {
    return { [this.l]: { $exists: true } };
  }
}

class MongoDbNotExistsExpression {
  constructor(l) {
    this.l = l;
  }
  build() {
    return { [this.l]: { $exists: false } };
  }
}

class MongoDbAllExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $all: this.r } };
  }
}

class MongoDbNotAllExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $not: { $all: this.r } } };
  }
}

class MongoDbSizeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $size: this.r } };
  }
}

class MongoDbNotSizeExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $not: { $size: this.r } } };
  }
}

class MongoDbAnyExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return { [this.l]: { $elemMatch: { $in: this.r } } };
  }
}

class MongoDbNotAnyExpression {
  constructor(l, r) {
    this.l = l;
    this.r = r;
  }
  build() {
    return {
      [this.l]: { $not: { $elemMatch: { $in: this.r } } },
    };
  }
}

const ElasticExpressions = {
  eq: ElasticEqualExpression,
  ne: ElasticNotEqualExpression,
  gt: ElasticGreaterThanExpression,
  gte: ElasticGreaterThanOrEqualExpression,
  lt: ElasticLessThanExpression,
  lte: ElasticLessThanOrEqualExpression,
  in: ElasticInExpression,
  nin: ElasticNotInExpression,
  like: ElasticLikeExpression,
  nlike: ElasticNotLikeExpression,
  ilike: ElasticILikeExpression,
  nilike: ElasticNotILikeExpression,
  isnull: ElasticIsNullExpression,
  notnull: ElasticNotNullExpression,
  between: ElasticBetweenExpression,
  nbetween: ElasticNotBetweenExpression,
  contains: ElasticContainsExpression,
  ncontains: ElasticNotContainsExpression,
  starts: ElasticStartsExpression,
  nstarts: ElasticNotStartsExpression,
  ends: ElasticEndsExpression,
  nends: ElasticNotEndsExpression,
  match: ElasticMatchExpression,
  nmatch: ElasticNotMatchExpression,
  overlap: ElasticOverlapExpression,
  noverlap: ElasticNotOverlapExpression,
  and: ElasticAndExpression,
  or: ElasticOrExpression,
  not: ElasticNotExpression,
  nor: ElasticNorExpression,
};

const SequelizeExpressions = {
  eq: SequelizeEqualExpression,
  ne: SequelizeNotEqualExpression,
  gt: SequelizeGreaterThanExpression,
  gte: SequelizeGreaterThanOrEqualExpression,
  lt: SequelizeLessThanExpression,
  lte: SequelizeLessThanOrEqualExpression,
  in: SequelizeInExpression,
  nin: SequelizeNotInExpression,
  like: SequelizeLikeExpression,
  nlike: SequelizeNotLikeExpression,
  ilike: SequelizeILikeExpression,
  nilike: SequelizeNotILikeExpression,
  isnull: SequelizeIsNullExpression,
  notnull: SequelizeNotNullExpression,
  between: SequelizeBetweenExpression,
  nbetween: SequelizeNotBetweenExpression,
  contains: SequelizeContainsExpression,
  ncontains: SequelizeNotContainsExpression,
  starts: SequelizeStartsExpression,
  nstarts: SequelizeNotStartsExpression,
  ends: SequelizeEndsExpression,
  nends: SequelizeNotEndsExpression,
  match: SequelizeMatchExpression,
  nmatch: SequelizeNotMatchExpression,
  overlap: SequelizeOverlapExpression,
  noverlap: SequelizeNotOverlapExpression,
  and: SequelizeAndExpression,
  or: SequelizeOrExpression,
  not: SequelizeNotExpression,
  nor: SequelizeNorExpression,
};

const MongoDbExpressions = {
  eq: MongoDbEqualExpression,
  ne: MongoDbNotEqualExpression,
  gt: MongoDbGreaterThanExpression,
  gte: MongoDbGreaterThanOrEqualExpression,
  lt: MongoDbLessThanExpression,
  lte: MongoDbLessThanOrEqualExpression,
  in: MongoDbInExpression,
  nin: MongoDbNotInExpression,
  like: MongoDbLikeExpression,
  nlike: MongoDbNotLikeExpression,
  ilike: MongoDbILikeExpression,
  nilike: MongoDbNotILikeExpression,
  isnull: MongoDbIsNullExpression,
  notnull: MongoDbNotNullExpression,
  between: MongoDbBetweenExpression,
  nbetween: MongoDbNotBetweenExpression,
  contains: MongoDbContainsExpression,
  ncontains: MongoDbNotContainsExpression,
  starts: MongoDbStartsExpression,
  nstarts: MongoDbNotStartsExpression,
  ends: MongoDbEndsExpression,
  nends: MongoDbNotEndsExpression,
  match: MongoDbMatchExpression,
  nmatch: MongoDbNotMatchExpression,
  overlap: MongoDbOverlapExpression,
  noverlap: MongoDbNotOverlapExpression,
  and: MongoDbAndExpression,
  or: MongoDbOrExpression,
  not: MongoDbNotExpression,
  nor: MongoDbNorExpression,
  exists: MongoDbExistsExpression,
  nexists: MongoDbNotExistsExpression,
  all: MongoDbAllExpression,
  notall: MongoDbNotAllExpression,
  size: MongoDbSizeExpression,
  notsize: MongoDbNotSizeExpression,
  any: MongoDbAnyExpression,
  notany: MongoDbNotAnyExpression,
};

const convertKeyValueToQuery = (key, value, platform) => {
  if (key.startsWith("$")) {
    const op = key.slice(1);
    return new platform[op](convertToSystemQuery(value, platform));
  } else {
    let op = "eq";
    let l = key;
    let r = value;
    if (Array.isArray(value)) {
      op = "in";
    } else if (typeof value == "object") {
      op = Object.keys(value)[0].slice(1);
      r = value[Object.keys(value)[0]];
    }
    return new platform[op](l, r);
  }
};

const convertToSystemQuery = (query, platform) => {
  if (Array.isArray(query)) {
    return query.map((item) => convertToSystemQuery(item, platform));
  }

  if (query == null) return query;

  if (typeof query !== "object") return query;

  if (Object.keys(query).length === 0) {
    return query;
  }

  if (Object.keys(query).length === 1) {
    const key = Object.keys(query)[0];
    const value = query[key];
    return convertKeyValueToQuery(key, value, platform);
  }

  if (Object.keys(query).length > 1) {
    let expArray = [];
    Object.keys(query).forEach((key) => {
      const value = query[key];
      expArray.push(convertKeyValueToQuery(key, value, platform));
    });
    return new platform.and(expArray);
  }
};

const convertUserQueryToElasticQuery = (userQuery) => {
  let mQuery = convertToSystemQuery(userQuery, ElasticExpressions);
  return mQuery ? mQuery.build() : null;
};

const convertUserQueryToSequelizeQuery = (userQuery) => {
  let mQuery = convertToSystemQuery(userQuery, SequelizeExpressions);
  return mQuery ? mQuery.build() : null;
};

const convertUserQueryToMongoDbQuery = (userQuery) => {
  const mapIdFields = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(mapIdFields);
    }
    if (obj && typeof obj === "object") {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = key === "id" ? "_id" : key;
        newObj[newKey] = mapIdFields(value);
      }
      return newObj;
    }
    return obj;
  };

  const mappedQuery = mapIdFields(userQuery);
  let mQuery = convertToSystemQuery(mappedQuery, MongoDbExpressions);
  return mQuery ? mQuery.build() : null;
};

module.exports = {
  convertUserQueryToElasticQuery,
  convertUserQueryToSequelizeQuery,
  convertUserQueryToMongoDbQuery,
};
