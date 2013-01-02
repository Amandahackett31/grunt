'use strict';

var grunt = require('../../lib/grunt');

exports['task.normalizeMultiTaskFiles'] = {
  setUp: function(done) {
    this.cwd = process.cwd();
    process.chdir('test/fixtures/files');
    done();
  },
  tearDown: function(done) {
    process.chdir(this.cwd);
    done();
  },
  'normalize': function(test) {
    test.expect(7);
    var actual, expected, key, value;
    var flatten = grunt.util._.flatten;

    key = 'dist/built.js';
    value = 'src/*1.js';
    actual = grunt.task.normalizeMultiTaskFiles(value, key);
    expected = [
      {
        dest: 'dist/built.js',
        src: ['src/file1.js'],
        orig: {dest: key, src: [value]},
      },
    ];
    test.deepEqual(actual, expected, 'should normalize destTarget: srcString.');

    key = 'dist/built.js';
    value = [['src/*1.js'], ['src/*2.js']];
    actual = grunt.task.normalizeMultiTaskFiles(value, key);
    expected = [
      {
        dest: 'dist/built.js',
        src: ['src/file1.js', 'src/file2.js'],
        orig: {dest: key, src: flatten(value)},
      },
    ];
    test.deepEqual(actual, expected, 'should normalize destTarget: srcArray.');

    value = {
      src: ['src/*1.js', 'src/*2.js'],
      dest: 'dist/built.js'
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: 'dist/built.js',
        src: ['src/file1.js', 'src/file2.js'],
        orig: value,
      },
    ];
    test.deepEqual(actual, expected, 'should normalize target: {src: srcStuff, dest: destStuff}.');

    value = {
      files: {
        'dist/built-a.js': 'src/*1.js',
        'dist/built-b.js': ['src/*1.js', [['src/*2.js']]]
      }
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: 'dist/built-a.js',
        src: ['src/file1.js'],
        orig: {dest: 'dist/built-a.js', src: [value.files['dist/built-a.js']]},
      },
      {
        dest: 'dist/built-b.js',
        src: ['src/file1.js', 'src/file2.js'],
        orig: {dest: 'dist/built-b.js', src: flatten(value.files['dist/built-b.js'])},
      },
    ];
    test.deepEqual(actual, expected, 'should normalize target: {files: {destTarget: srcStuff, ...}}.');

    value = {
      files: [
        {'dist/built-a.js': 'src/*.whoops'},
        {'dist/built-b.js': [[['src/*1.js'], 'src/*2.js']]}
      ]
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: 'dist/built-a.js',
        src: [],
        orig: {dest: Object.keys(value.files[0])[0], src: [value.files[0]['dist/built-a.js']]},
      },
      {
        dest: 'dist/built-b.js',
        src: ['src/file1.js', 'src/file2.js'],
        orig: {dest: Object.keys(value.files[1])[0], src: flatten(value.files[1]['dist/built-b.js'])},
      },
    ];
    test.deepEqual(actual, expected, 'should normalize target: {files: [{destTarget: srcStuff}, ...]}.');

    value = {
      files: [
        {dest: 'dist/built-a.js', src: ['src/*2.js']},
        {dest: 'dist/built-b.js', src: ['src/*1.js', 'src/*2.js']}
      ]
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: 'dist/built-a.js',
        src: ['src/file2.js'],
        orig: value.files[0],
      },
      {
        dest: 'dist/built-b.js',
        src: ['src/file1.js', 'src/file2.js'],
        orig: value.files[1],
      },
    ];
    test.deepEqual(actual, expected, 'should normalize target: {files: [{src: srcStuff, dest: destStuff}, ...]}.');

    value = {
      files: [
        {dest: 'dist/built-a.js', src: ['src/*2.js'], foo: 123, bar: true},
        {dest: 'dist/built-b.js', src: ['src/*1.js', 'src/*2.js'], foo: 456, bar: null}
      ]
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: 'dist/built-a.js',
        src: ['src/file2.js'],
        foo: 123,
        bar: true,
        orig: value.files[0],
      },
      {
        dest: 'dist/built-b.js',
        src: ['src/file1.js', 'src/file2.js'],
        foo: 456,
        bar: null,
        orig: value.files[1],
      },
    ];
    test.deepEqual(actual, expected, 'should propagate extra properties.');

    test.done();
  },
  'nonull': function(test) {
    test.expect(2);
    var actual, expected, value;

    value = {
      src: ['src/xxx*.js', 'src/yyy*.js'],
      dest: 'dist/built.js',
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: value.dest,
        src: [],
        orig: value,
      },
    ];
    test.deepEqual(actual, expected, 'if nonull is not set, should not include non-matching patterns.');

    value = {
      src: ['src/xxx*.js', 'src/yyy*.js'],
      dest: 'dist/built.js',
      nonull: true,
    };
    actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    expected = [
      {
        dest: value.dest,
        src: value.src,
        nonull: true,
        orig: value,
      },
    ];
    test.deepEqual(actual, expected, 'if nonull is set, should include non-matching patterns.');
    test.done();
  },
  'template processing': function(test) {
    test.expect(1);

    // Processing "TEST" recursively should return "123"
    grunt.config.set(['TEST'], '<%= TEST2.PROP %>');
    grunt.config.set(['TEST2'], {
      PROP: '<%= TEST2.PROP1 %><%= TEST2.PROP2 + TEST2.PROP3 %>',
      PROP1: '1',
      PROP2: '2',
      PROP3: '3'
    });
    grunt.config.set(['TEST3'], ['<%= TEST4 %>']);
    grunt.config.set(['TEST4'], ['src/f*<%= TEST2.PROP1 %>.js', 'src/f*<%= TEST2.PROP2 %>.js']);

    var value = {
      files: [
        {dest: 'dist/built-<%= TEST %>-a.js', src: ['<%= TEST3 %>', 'src/file?-<%= TEST %>.js']},
        {dest: 'dist/built-<%= TEST %>-b.js', src: ['src/*1-<%= TEST %>.js', 'src/*2-<%= TEST %>.js']}
      ]
    };
    var actual = grunt.task.normalizeMultiTaskFiles(value, 'ignored');
    var expected = [
      {
        dest: 'dist/built-123-a.js',
        src: ['src/file1.js', 'src/file2.js', 'src/file1-123.js', 'src/file2-123.js'],
        orig: value.files[0],
      },
      {
        dest: 'dist/built-123-b.js',
        src: ['src/file1-123.js', 'src/file2-123.js'],
        orig: value.files[1],
      }
    ];
    test.deepEqual(actual, expected, 'should process templates recursively.');

    test.done();
  }
};
