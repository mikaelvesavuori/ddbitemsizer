import test from 'ava';

import { DynamoDbItemSizer } from '../src/DynamoDbItemSizer';

const itemSizer = new DynamoDbItemSizer();

/**
 * Success scenarios.
 */

test('It should handle a basic item shape with a single key', (t) => {
  const expected = 14;

  const result = itemSizer.get({
    key: 'Hello World'
  });

  t.is(result, expected);
});

test('It should handle a basic item shape with multiple keys', (t) => {
  const expected = 23;

  const result = itemSizer.get({
    key: 'Hello World',
    name: 'Harry'
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a string', (t) => {
  const expected = 14;

  const result = itemSizer.get({
    key: {
      S: 'Hello World'
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a positive integer', (t) => {
  const expected = 7;

  const result = itemSizer.get({
    key: {
      N: '12345'
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a positive floating point number', (t) => {
  const expected = 12;

  const result = itemSizer.get({
    key: {
      N: '412.481278720021'
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a negative integer', (t) => {
  const expected = 8;

  const result = itemSizer.get({
    key: {
      N: '-19862'
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a negative floating point number', (t) => {
  const expected = 10;

  const result = itemSizer.get({
    key: {
      N: '-29721.972'
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using binary', (t) => {
  const expected = 20;

  const result = itemSizer.get({
    key: {
      B: Buffer.from('Hello world! 👋')
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a null (boolean) value', (t) => {
  const expected = 4;

  const result = itemSizer.get({
    key: {
      NULL: false
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a null (empty) value', (t) => {
  const expected = 4;

  const result = itemSizer.get({
    key: {
      NULL: ''
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a string set', (t) => {
  const expected = 18;

  const result = itemSizer.get({
    key: {
      SS: ['radio', 'flashlight']
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a number set', (t) => {
  const expected = 13;

  const result = itemSizer.get({
    key: {
      NS: ['911', '311', '5559400']
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a binary set', (t) => {
  const expected = 33;

  const result = itemSizer.get({
    key: {
      BS: [Buffer.from('Hello world! 👋'), Buffer.from('Goodbye! 🛼')]
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using an empty list', (t) => {
  const expected = 3;

  const result = itemSizer.get({
    '': {
      L: []
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a list', (t) => {
  const expected = 50;

  const result = itemSizer.get({
    key: {
      L: [
        {
          S: 'Key of Lion'
        },
        {
          S: 'Key of Woodman'
        },
        {
          S: 'Key of Scarecrow'
        }
      ]
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a map with a single attribute', (t) => {
  const expected = 21;

  const result = itemSizer.get({
    key: {
      M: {
        firstName: { S: 'Harry' }
      }
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a map with multiple attributes', (t) => {
  const expected = 35;

  const result = itemSizer.get({
    key: {
      M: {
        firstName: { S: 'Harry' },
        lastName: { S: 'Mason' }
      }
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using a map with multiple keys', (t) => {
  const expected = 76;

  const result = itemSizer.get({
    key: {
      M: {
        firstName: {
          S: 'Harry'
        },
        lastName: {
          S: 'Mason'
        }
      }
    },
    key2: {
      M: {
        firstName: {
          S: 'Alessa'
        },
        lastName: {
          S: 'Gillespie'
        }
      }
    }
  });

  t.is(result, expected);
});

test('It should handle a DynamoDB item shape using multiple types', (t) => {
  const expected = 119;

  const result = itemSizer.get({
    key: {
      M: {
        firstName: {
          S: 'Harry'
        },
        lastName: {
          S: 'Mason'
        }
      }
    },
    key2: {
      L: [
        {
          S: 'Key of Lion'
        },
        {
          S: 'Key of Woodman'
        },
        {
          S: 'Key of Scarecrow'
        }
      ]
    },
    key3: {
      N: '5556128'
    },
    key4: {
      NULL: true
    },
    key5: {
      SS: ['radio', 'flashlight']
    }
  });

  t.is(result, expected);
});

test('It should work with a complex example', (t) => {
  const expected = 141;

  const result = itemSizer.get({
    itemType: { S: 'SLOT' },
    id: { S: 'abc1231' },
    hostName: { S: 'Harry Mason' },
    timeSlot: { S: 'February 23, 1999' },
    slotStatus: { S: 'OPEN' },
    createdAt: { S: 'February 1, 1999' },
    updatedAt: { S: 'February 1, 1999' },
    expiresAt: { N: '2099' }
  });

  t.is(result, expected);
});

/**
 * Failure scenarios.
 */

test('It should throw a MissingTypeError when unable to match input to a DynamoDB data type', (t) => {
  const expected = 'MissingTypeError';

  const error: any = t.throws(() => {
    itemSizer.get({
      x: {
        asdaafa: 'io3hj89y'
      }
    });
  });

  t.is(error.name, expected);
});

test('It should throw a MissingInputError when the input is empty', (t) => {
  const expected = 'MissingInputError';

  const error: any = t.throws(() => {
    // @ts-ignore
    itemSizer.get();
  });

  t.is(error.name, expected);
});

test('It should return zero for an empty object', (t) => {
  const expected = 0;

  const result = itemSizer.get({});

  t.is(result, expected);
});
