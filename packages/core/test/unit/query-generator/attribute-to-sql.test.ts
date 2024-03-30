import { DataTypes, Deferrable, fn } from '@sequelize/core';
import type { AttributeToSqlOptions } from '@sequelize/core/_non-semver-use-at-your-own-risk_/abstract-dialect/query-generator.internal-types.js';
import util from 'node:util';
import { createTester, expectPerDialect, sequelize } from '../../support';

const supportedDataTypes = sequelize.dialect.supports.dataTypes;
const queryGenerator = sequelize.dialect.queryGenerator;

type Expectations = {
  [dialectName: string]: string | string[] | Error;
};

describe('QueryGenerator#attributeToSQL', () => {
  const testSql = createTester(
    // TODO: add typings for attributeObj, based on typings of attributeToSQL
    (it, attributeObj: any, expectations: Expectations, options?: AttributeToSqlOptions) => {
      it(
        util.inspect(attributeObj, { depth: 10 }) + (options ? `, ${util.inspect(options)}` : ''),
        () => {
          return expectPerDialect(
            () =>
              // @ts-expect-error -- attributeToSQL is untyped
              queryGenerator.attributeToSQL(attributeObj, options),
            expectations,
          );
        },
      );
    },
  );

  testSql('INTEGER', {
    default: 'INTEGER',
    mssql: 'INTEGER NULL',
  });

  testSql(sequelize.normalizeDataType(DataTypes.INTEGER), {
    default: 'INTEGER',
    mssql: 'INTEGER NULL',
  });

  testSql(
    { type: 'INTEGER' },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  testSql(
    { type: sequelize.normalizeDataType(DataTypes.INTEGER) },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  testSql(
    { type: sequelize.normalizeDataType(DataTypes.ENUM('value1', 'value2')) },
    {
      default: `ENUM('value1', 'value2')`,
      'mssql db2 ibmi': new Error('quoteIdentifier received a non-string identifier:'),
      snowflake: 'VARCHAR(255)',
      sqlite: 'TEXT',
    },
  );

  testSql(
    { type: sequelize.normalizeDataType(DataTypes.ENUM('value1', 'value2')), field: 'foo' },
    {
      default: `ENUM('value1', 'value2')`,
      mssql: `NVARCHAR(255) CHECK ([foo] IN(N'value1', N'value2'))`,
      snowflake: 'VARCHAR(255)',
      sqlite: 'TEXT',
      'db2 ibmi': `VARCHAR(255) CHECK ("foo" IN('value1', 'value2'))`,
    },
  );

  testSql(
    { type: sequelize.normalizeDataType(DataTypes.ENUM('value1', 'value2')), field: 'foo' },
    {
      default: `ENUM('value1', 'value2')`,
      mssql: `NVARCHAR(255) CHECK ([foo] IN(N'value1', N'value2'))`,
      snowflake: 'VARCHAR(255)',
      sqlite: 'TEXT',
      db2: `DATA TYPE VARCHAR(255) CHECK ("foo" IN('value1', 'value2'))`,
      ibmi: `VARCHAR(255) ADD CHECK ("foo" IN('value1', 'value2'))`,
    },
    { context: 'changeColumn' },
  );

  if (supportedDataTypes.ARRAY) {
    testSql(
      {
        type: DataTypes.ARRAY({
          type: DataTypes.ENUM('value1', 'value2'),
        }),
      },
      {
        default: `ENUM('value1', 'value2')[]`,
      },
    );
  }

  testSql(
    { type: 'INTEGER', field: 'foo' },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  testSql(
    { type: 'INTEGER', allowNull: false },
    {
      default: 'INTEGER NOT NULL',
    },
  );

  testSql(
    { type: 'INTEGER', allowNull: true },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
      db2: ['DATA TYPE INTEGER', 'DROP NOT NULL'],
      ibmi: 'INTEGER DROP NOT NULL',
    },
    { context: 'changeColumn' },
  );

  testSql(
    { type: 'INTEGER', allowNull: false },
    {
      default: 'INTEGER NOT NULL',
      db2: ['DATA TYPE INTEGER', 'NOT NULL'],
    },
    { context: 'changeColumn' },
  );

  testSql(
    { type: 'INTEGER', autoIncrement: true },
    {
      default: 'INTEGER auto_increment',
      postgres: 'INTEGER SERIAL',
      mssql: 'INTEGER NULL IDENTITY(1,1)',
      snowflake: 'INTEGER AUTOINCREMENT',
      sqlite: 'INTEGER',
      db2: 'INTEGER GENERATED BY DEFAULT AS IDENTITY(START WITH 1, INCREMENT BY 1)',
      ibmi: 'INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1)',
    },
  );

  testSql(
    { type: 'INTEGER', autoIncrement: true, primaryKey: true },
    {
      default: 'INTEGER auto_increment PRIMARY KEY',
      postgres: 'INTEGER SERIAL PRIMARY KEY',
      mssql: 'INTEGER IDENTITY(1,1) PRIMARY KEY',
      'snowflake sqlite': 'INTEGER AUTOINCREMENT PRIMARY KEY',
      db2: 'INTEGER NOT NULL GENERATED BY DEFAULT AS IDENTITY(START WITH 1, INCREMENT BY 1) PRIMARY KEY',
      ibmi: 'INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1) PRIMARY KEY',
    },
  );

  testSql(
    { type: 'INTEGER', autoIncrement: true, initialAutoIncrement: 5 },
    {
      default: 'INTEGER auto_increment',
      postgres: 'INTEGER SERIAL',
      mssql: 'INTEGER NULL IDENTITY(1,1)',
      snowflake: 'INTEGER AUTOINCREMENT',
      sqlite: 'INTEGER',
      db2: 'INTEGER GENERATED BY DEFAULT AS IDENTITY(START WITH 5, INCREMENT BY 1)',
      ibmi: 'INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1)',
    },
  );

  testSql(
    { type: 'INTEGER', autoIncrement: true, autoIncrementIdentity: true },
    {
      default: 'INTEGER auto_increment',
      postgres: 'INTEGER GENERATED BY DEFAULT AS IDENTITY',
      mssql: 'INTEGER NULL IDENTITY(1,1)',
      snowflake: 'INTEGER AUTOINCREMENT',
      sqlite: 'INTEGER',
      db2: 'INTEGER GENERATED BY DEFAULT AS IDENTITY(START WITH 1, INCREMENT BY 1)',
      ibmi: 'INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1)',
    },
  );

  testSql(
    { type: 'INTEGER', unique: true },
    {
      default: 'INTEGER UNIQUE',
      mssql: 'INTEGER NULL UNIQUE',
    },
  );

  testSql(
    { type: 'INTEGER', unique: true },
    {
      default: 'INTEGER UNIQUE',
      mssql: 'INTEGER NULL',
      db2: 'DATA TYPE INTEGER',
    },
    { context: 'changeColumn' },
  );

  testSql(
    { type: 'INTEGER', primaryKey: true },
    {
      default: 'INTEGER PRIMARY KEY',
      db2: 'INTEGER NOT NULL PRIMARY KEY',
    },
  );

  testSql(
    { type: 'INTEGER', first: true },
    {
      default: 'INTEGER FIRST',
      'postgres sqlite db2': 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  testSql(
    { type: 'INTEGER', after: 'bar' },
    {
      default: 'INTEGER AFTER `bar`',
      'postgres sqlite db2': 'INTEGER',
      mssql: 'INTEGER NULL',
      'snowflake ibmi': 'INTEGER AFTER "bar"',
    },
  );

  testSql(
    { type: 'INTEGER', withoutForeignKeyConstraints: true },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  testSql(
    {
      type: 'INTEGER',
      onUpdate: 'SET NULL',
      onDelete: 'NO ACTION',
    },
    {
      default: 'INTEGER',
      mssql: 'INTEGER NULL',
    },
  );

  describe('comment', () => {
    testSql(
      { type: 'INTEGER', comment: 'Foo' },
      {
        default: `INTEGER COMMENT 'Foo'`,
        // Normally a context is given and this is only used for createTable where comments are quoted there so this is fine for now
        postgres: 'INTEGER COMMENT Foo',
        mssql: "INTEGER NULL COMMENT N'Foo'",
        'sqlite ibmi': 'INTEGER',
      },
    );

    testSql(
      { type: 'INTEGER', comment: "'); DELETE YOLO INJECTIONS; -- " },
      {
        default: `INTEGER COMMENT '\\'); DELETE YOLO INJECTIONS; -- '`,
        // Normally a context is given and this is only used for createTable where comments are quoted there so this is fine for now
        postgres: "INTEGER COMMENT '); DELETE YOLO INJECTIONS; -- ",
        mssql: "INTEGER NULL COMMENT N'''); DELETE YOLO INJECTIONS; -- '",
        'sqlite ibmi': 'INTEGER',
        'snowflake db2': `INTEGER COMMENT '''); DELETE YOLO INJECTIONS; -- '`,
      },
    );

    testSql(
      { type: 'INTEGER', comment: 'Foo', key: 'baz' },
      {
        default: `INTEGER COMMENT 'Foo'`,
        postgres: `INTEGER; COMMENT ON COLUMN "bar"."baz" IS 'Foo'`,
        mssql: "INTEGER NULL COMMENT N'Foo'",
        'sqlite ibmi': 'INTEGER',
      },
      { context: 'addColumn', table: 'bar' },
    );
  });

  describe('defaultValue', () => {
    testSql(
      { type: 'INTEGER', defaultValue: 2 },
      {
        default: 'INTEGER DEFAULT 2',
      },
    );

    testSql(
      { type: 'INTEGER', defaultValue: true },
      {
        default: 'INTEGER DEFAULT true',
        'mssql sqlite ibmi': 'INTEGER DEFAULT 1',
      },
    );

    testSql(
      { type: 'INTEGER', defaultValue: false },
      {
        default: 'INTEGER DEFAULT false',
        'mssql sqlite ibmi': 'INTEGER DEFAULT 0',
      },
    );

    testSql(
      { type: sequelize.normalizeDataType(DataTypes.INTEGER), defaultValue: undefined },
      {
        default: 'INTEGER',
        mssql: 'INTEGER NULL',
      },
    );

    testSql(
      { type: sequelize.normalizeDataType(DataTypes.INTEGER), defaultValue: fn('NOW') },
      {
        default: 'INTEGER DEFAULT NOW()',
        mysql: 'INTEGER DEFAULT (NOW())',
      },
    );

    testSql(
      { type: sequelize.normalizeDataType(DataTypes.BLOB), defaultValue: 'default' },
      {
        default: 'BLOB',
        postgres: `BYTEA DEFAULT '\\x64656661756c74'`,
        mssql: 'VARBINARY(MAX) DEFAULT 0x64656661756c74',
        sqlite: `BLOB DEFAULT X'64656661756c74'`,
        db2: `BLOB(1M) DEFAULT BLOB('default')`,
        ibmi: `BLOB(1M) DEFAULT 'default'`,
      },
    );

    testSql(
      { type: sequelize.normalizeDataType(DataTypes.TEXT), defaultValue: 'default' },
      {
        default: 'TEXT',
        'postgres sqlite': `TEXT DEFAULT 'default'`,
        mssql: `NVARCHAR(MAX) DEFAULT N'default'`,
        'db2 ibmi': `CLOB(2147483647) DEFAULT 'default'`,
      },
    );

    if (supportedDataTypes.COLLATE_BINARY) {
      testSql(
        { type: sequelize.normalizeDataType(DataTypes.STRING.BINARY), defaultValue: 'default' },
        {
          default: 'VARCHAR(255) BINARY',
          sqlite: `TEXT COLLATE BINARY DEFAULT 'default'`,
          'db2 ibmi': 'VARCHAR(255) FOR BIT DATA',
        },
      );
    }

    if (supportedDataTypes.GEOMETRY) {
      testSql(
        {
          type: sequelize.normalizeDataType(DataTypes.GEOMETRY),
          defaultValue: { type: 'Point', coordinates: [39.807_222, -76.984_722] },
        },
        {
          default: 'GEOMETRY',
          postgres: `GEOMETRY DEFAULT 'ST_GeomFromGeoJSON(''{"type":"Point","coordinates":[39.807222,-76.984722]}'')'`,
        },
      );
    }

    if (supportedDataTypes.JSON) {
      testSql(
        {
          type: sequelize.normalizeDataType(DataTypes.JSON),
          defaultValue: 'default',
        },
        {
          default: 'JSON',
          postgres: `JSON DEFAULT '"default"'`,
          mssql: `NVARCHAR(MAX) DEFAULT N'"default"'`,
          sqlite: `TEXT DEFAULT '"default"'`,
        },
      );
    }
  });

  describe('references', () => {
    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("id")',
        'mariadb mysql sqlite': 'INTEGER REFERENCES `myTable` (`id`)',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable', key: 'foo' },
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("foo")',
        'mariadb mysql sqlite': 'INTEGER REFERENCES `myTable` (`foo`)',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([foo])',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        key: 'foo',
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("id")',
        'mariadb mysql sqlite': 'INTEGER REFERENCES `myTable` (`id`)',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable', deferrable: Deferrable.INITIALLY_DEFERRED },
      },
      {
        default: 'INTEGER REFERENCES `myTable` (`id`)',
        postgres: 'INTEGER REFERENCES "myTable" ("id") DEFERRABLE INITIALLY DEFERRED',
        'snowflake db2 ibmi': 'INTEGER REFERENCES "myTable" ("id")',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
      },
    );

    describe('options.table', () => {
      testSql(
        { type: 'INTEGER', references: { table: 'myTable' } },
        {
          default: 'INTEGER REFERENCES "myTable" ("id")',
          'mariadb mysql':
            'INTEGER, ADD CONSTRAINT `otherTable_bar_foreign_idx` FOREIGN KEY (`bar`) REFERENCES `myTable` (`id`)',
          mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
          snowflake:
            'INTEGER, ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
          sqlite: 'INTEGER REFERENCES `myTable` (`id`)',
          db2: 'INTEGER, CONSTRAINT otherTable_"bar"_fidx FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
          ibmi: 'INTEGER ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
        },
        { context: 'addColumn', foreignKey: 'bar', table: 'otherTable' },
      );

      testSql(
        { type: 'INTEGER', references: { table: 'myTable' } },
        {
          'mariadb mysql':
            'INTEGER, ADD CONSTRAINT `otherTable_bar_foreign_idx` FOREIGN KEY (`bar`) REFERENCES `myTable` (`id`)',
          // TODO: this likely should not infer the schema from options.table.schema but other tests currently fail if we don't
          postgres: 'INTEGER REFERENCES "otherSchema"."myTable" ("id")',
          mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
          snowflake:
            'INTEGER, ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
          sqlite: 'INTEGER REFERENCES `myTable` (`id`)',
          db2: 'INTEGER, CONSTRAINT otherTable_"bar"_fidx FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
          ibmi: 'INTEGER ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "myTable" ("id")',
        },
        {
          context: 'addColumn',
          foreignKey: 'bar',
          table: { tableName: 'otherTable', schema: 'otherSchema' },
        },
      );

      testSql(
        { type: 'INTEGER', references: { table: { tableName: 'myTable', schema: 'mySchema' } } },
        {
          default: 'INTEGER REFERENCES "mySchema"."myTable" ("id")',
          'mariadb mysql':
            'INTEGER, ADD CONSTRAINT `otherTable_bar_foreign_idx` FOREIGN KEY (`bar`) REFERENCES `mySchema`.`myTable` (`id`)',
          mssql: 'INTEGER NULL REFERENCES [mySchema].[myTable] ([id])',
          snowflake:
            'INTEGER, ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "mySchema"."myTable" ("id")',
          sqlite: 'INTEGER REFERENCES `mySchema.myTable` (`id`)',
          db2: 'INTEGER, CONSTRAINT otherTable_"bar"_fidx FOREIGN KEY ("bar") REFERENCES "mySchema"."myTable" ("id")',
          ibmi: 'INTEGER ADD CONSTRAINT "otherTable_""bar""_foreign_idx" FOREIGN KEY ("bar") REFERENCES "mySchema"."myTable" ("id")',
        },
        {
          context: 'addColumn',
          foreignKey: 'bar',
          table: { tableName: 'otherTable', schema: 'otherSchema' },
        },
      );
    });

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        onUpdate: 'SeT NuLl',
        onDelete: 'nO AcTiOn',
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("id") ON DELETE NO ACTION ON UPDATE SET NULL',
        'mariadb mysql sqlite':
          'INTEGER REFERENCES `myTable` (`id`) ON DELETE NO ACTION ON UPDATE SET NULL',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id]) ON DELETE NO ACTION ON UPDATE SET NULL',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        Model: { tableName: 'myTable' },
        onUpdate: 'SET NULL',
        onDelete: 'NO ACTION',
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("id") ON DELETE NO ACTION ON UPDATE SET NULL',
        'mariadb mysql sqlite':
          'INTEGER REFERENCES `myTable` (`id`) ON DELETE NO ACTION ON UPDATE SET NULL',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        onUpdate: 'CASCADE',
      },
      {
        default: 'INTEGER REFERENCES `myTable` (`id`) ON UPDATE CASCADE',
        'postgres snowflake': 'INTEGER REFERENCES "myTable" ("id") ON UPDATE CASCADE',
        'db2 ibmi': 'INTEGER REFERENCES "myTable" ("id")',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id]) ON UPDATE CASCADE',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        onUpdate: '',
        onDelete: '',
      },
      {
        default: 'INTEGER REFERENCES "myTable" ("id")',
        'mariadb mysql sqlite': 'INTEGER REFERENCES `myTable` (`id`)',
        mssql: 'INTEGER NULL REFERENCES [myTable] ([id])',
      },
    );

    testSql(
      {
        type: 'INTEGER',
        references: { table: 'myTable' },
        onUpdate: 'SET NULL',
        onDelete: 'NO ACTION',
        unique: true,
      },
      {
        default:
          'INTEGER UNIQUE REFERENCES "myTable" ("id") ON DELETE NO ACTION ON UPDATE SET NULL',
        'mariadb mysql sqlite':
          'INTEGER UNIQUE REFERENCES `myTable` (`id`) ON DELETE NO ACTION ON UPDATE SET NULL',
        mssql:
          'INTEGER NULL UNIQUE REFERENCES [myTable] ([id]) ON DELETE NO ACTION ON UPDATE SET NULL',
      },
    );
  });

  // TODO: add some more combinations after we throw for invalid options so that we have at least one working combination per dialect
  describe('combinations', () => {
    testSql(
      {
        type: 'INTEGER',
        allowNull: false,
        autoIncrement: true,
        defaultValue: 1,
        references: { table: 'Bar' },
        onDelete: 'CASCADE',
        onUpdate: 'RESTRICT',
      },
      {
        default:
          'INTEGER NOT NULL auto_increment DEFAULT 1 REFERENCES `Bar` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT',
        postgres:
          'INTEGER NOT NULL SERIAL DEFAULT 1 REFERENCES "Bar" ("id") ON DELETE CASCADE ON UPDATE RESTRICT',
        mssql:
          'INTEGER NOT NULL IDENTITY(1,1) DEFAULT 1 REFERENCES [Bar] ([id]) ON DELETE CASCADE ON UPDATE RESTRICT',
        snowflake:
          'INTEGER NOT NULL AUTOINCREMENT DEFAULT 1 REFERENCES "Bar" ("id") ON DELETE CASCADE ON UPDATE RESTRICT',
        sqlite:
          'INTEGER NOT NULL DEFAULT 1 REFERENCES `Bar` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT',
        db2: 'INTEGER NOT NULL GENERATED BY DEFAULT AS IDENTITY(START WITH 1, INCREMENT BY 1) DEFAULT 1 REFERENCES "Bar" ("id") ON DELETE CASCADE ON UPDATE RESTRICT',
        ibmi: 'INTEGER NOT NULL GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1) DEFAULT 1 REFERENCES "Bar" ("id") ON DELETE CASCADE ON UPDATE RESTRICT',
      },
    );
  });
});
