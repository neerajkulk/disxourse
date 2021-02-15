const helper = require('./helpers');

test('parse authors (Empty)', () => {
    expect(helper.parseAuthors([])).toBe('');
});

test('parse authors (few)', () => {
    expect(helper.parseAuthors(['a', 'b', 'c'])).toBe("a,  b,  c");
});


test('parse authors (many)', () => {
    const authors = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
    expect(helper.parseAuthors(authors)).toBe("a,  b,  c,  d,  e,  f,  g,  h,  i,  j and Collaborators");
});