#!/usr/bin/env node

import { runSkill, loadAllSkills } from '@ai-skills/core'

const args = process.argv.slice(2)

async function main() {
  const skills = await loadAllSkills()

  console.log('👉 cwd:', process.cwd())
  console.log('👉 loaded skills:', Object.keys(skills))

  const command = args[0]
  const skillName = args[1]

  if (command === 'run') {
    if (skillName === 'all') {
      for (const skill of Object.values(skills)) {
        await runSkill(skill)
      }
      return
    }

    const skill = skills[skillName]

    if (!skill) {
      console.error(`❌ Skill not found: ${skillName}`)
      process.exit(1)
    }

    await runSkill(skill)
  } else {
    console.log('Usage:')
    console.log('  ai-skills run <skill-name>')
    console.log('  ai-skills run all')
  }
}

main()