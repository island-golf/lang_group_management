---
name: lang-group-mgmt
description: "Skills for managing language groups, members, and inventory in the Angular app using Supabase. Use when performing CRUD operations on groups, members, or inventory."
metadata:
  author: GitHub Copilot
  version: "0.1.0"
---

# Language Group Management Skills

This skill provides operations for managing language learning groups, members, and inventory using Supabase.

## Core Principles

- Always verify database operations after execution.
- Use RLS policies for security.

## Operations

### Group Management

- **Create Group**: Call `supabase.rpc('create_group', {name: 'Group Name', description: 'Description'})`
- **Get Groups**: `supabase.from('groups').select('*')`
- **Update Group**: `supabase.from('groups').update({name, description}).eq('id', id)`
- **Delete Group**: `supabase.from('groups').delete().eq('id', id)`

### Member Management

- **Add Member**: `supabase.rpc('add_member', {group_id: 1, user_id: 'user123', role: 'member'})`
- **Get Members**: `supabase.from('members').select('*').eq('group_id', group_id)`
- **Remove Member**: `supabase.from('members').delete().eq('group_id', group_id).eq('user_id', user_id)`

### Inventory Management

- **Update Inventory**: `supabase.rpc('update_inventory', {item_id: 1, amount: 10})`
- **Get Inventory**: `supabase.from('M_INVENTORY').select('*')`

See assets/ for SQL schema and functions.
