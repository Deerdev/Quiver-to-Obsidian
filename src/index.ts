#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Quiver from './quiver/index.js';

const program = new Command();
const { log } = console;

program.requiredOption('-q, --quiver-path <path>', 'quiver library dir path')
  .requiredOption('-o, --output-path <path>', 'output dir path')
  .option('-e, --ext-names [ext...]', '[option] replace some unknown resource image ext to `png`');
program.showHelpAfterError();

program.parse(process.argv);
const options = program.opts();
const { quiverPath } = options;
const { outputPath } = options;
const { extNames } = options;

const execute = async (): Promise<void> => {
  try {
    const quiver = await Quiver.newQuiver(quiverPath, extNames);
    const quiverOutput = await quiver.transformQvLibraryToObsidian(outputPath);
    log(chalk.green(`🎉 Finished, please check output path: ${quiverOutput}`));
    process.exit(0);
  } catch (error) {
    log(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
};

execute();
