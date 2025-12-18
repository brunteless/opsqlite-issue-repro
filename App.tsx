/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  Button,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { DB, open } from '@op-engineering/op-sqlite';

class Database {
  private readonly db: DB;

  constructor() {
    console.log('Initializing database...');
    this.db = open({ name: 'test.db' });
    const createQuery = `
        CREATE TABLE IF NOT EXISTS test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          groupId TEXT NOT NULL,
          name TEXT NOT NULL
        )
      `;
    try {
      this.db.executeSync(createQuery);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }

  async insertRandomItems() {
    console.log('insertRandomItems called');
    const itemCount = this.randInt(8, 16);

    const items = Array.from({ length: itemCount }, (_, i) => ({
      name: `Item ${i}`,
    }));

    const batchSize = this.randInt(3, 6);

    const batches = Array.from(
      { length: Math.ceil(itemCount / batchSize) },
      (_, i) => items.slice(i * batchSize, (i + 1) * batchSize),
    );

    const query = `INSERT INTO test (groupId, name) VALUES (?, ?)`;

    try {
      await this.db.transaction(async tx => {
        for (const batch of batches) {
          const id = this.generateId();

          for (const item of batch) {
            await tx.execute(query, [id, item.name]);
          }
        }
      });
      console.log('Transaction completed successfully');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  }

  async clearAllItems() {
    console.log('clearAllItems called');
    const query = `DELETE FROM test`;
    try {
      await this.db!.transaction(async tx => {
        await tx.execute(query);
      });
      console.log('Clear transaction completed successfully');
    } catch (error) {
      console.error('Clear transaction failed:', error);
    }
  }

  public getGroupCountReactive(callback: (num: number) => void) {
    const query = `SELECT COUNT(DISTINCT groupId) as count FROM test;`;

    console.log('Setting up group count reactive query');
    return this.db.reactiveExecute({
      query,
      arguments: [],
      fireOn: [
        {
          table: 'test',
        },
      ],
      callback: res => {
        console.log('Group count callback:', res);
        callback(res.rows[0]?.count ?? 0);
      },
    });
  }

  public getItemCountReactive(callback: (num: number) => void) {
    const query = `SELECT COUNT(*) as count FROM test;`;

    console.log('Setting up item count reactive query');
    return this.db.reactiveExecute({
      query,
      arguments: [],
      fireOn: [
        {
          table: 'test',
        },
      ],
      callback: res => {
        console.log('Item count callback:', res);
        callback(res.rows[0]?.count ?? 0);
      },
    });
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

const database = new Database();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function useReactiveValues() {
  const [items, setItems] = useState<number>(0);
  const [groups, setGroups] = useState<number>(0);

  useEffect(() => database.getItemCountReactive(setItems), []);
  useEffect(() => database.getGroupCountReactive(setGroups), []);

  return { items, groups };
}

function AppContent() {
  const { items, groups } = useReactiveValues();

  return (
    <View style={styles.container}>
      <Text>Items: {items}</Text>
      <Text>Groups: {groups}</Text>
      <Button
        onPress={() => database.insertRandomItems()}
        title={'Insert random items'}
      />
      <Button onPress={() => database.clearAllItems()} title={'Reset'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
