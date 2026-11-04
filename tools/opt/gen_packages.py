#!/usr/bin/env python3
"""Generate package prompts, the package part of waves.yaml and docs/opt/packages.json.

Input : docs/opt/packages.spec.json (hand-curated) and the item prompts in docs/prompts/items/.
Output: docs/prompts/PK-*.md, waves.yaml (everything from the first PK-00/W17 wave on), docs/opt/packages.json.
Run from the repo root: python3 tools/opt/gen_packages.py
"""
import json, os, re, sys, collections
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)
SPEC = json.load(open('docs/opt/packages.spec.json', encoding='utf-8'))
ITEMS_DIR = 'docs/prompts/items'
TEST_PROJ = 'tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj'
BUILD = 'dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true'
SMOKE = 'node tools/qa/web-smoke.js'
QUESTIONS = ('nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze '
             'rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.')


def split_list(s):
    return [x for x in re.split(r'[\s,]+', s or '') if x]


def load_items():
    items = {}
    for fn in sorted(os.listdir(ITEMS_DIR)):
        m = re.match(r'^(W\d+-\d+)-.*\.md$', fn)
        if not m:
            continue
        text = open(os.path.join(ITEMS_DIR, fn), encoding='utf-8').read()
        g = lambda k: (re.search(r'^' + k + r':\s*(.*)$', text, re.M) or [None, ''])[1].strip()
        title = re.match(r'^# (W\d+-\d+): (.*)$', text, re.M)
        body = text[text.index('\nGoal:') + 1:]
        body = body[:body.index('\nProhibited:')] if '\nProhibited:' in body else body
        body = re.sub(r'\s*Test rules: use `RepoFile.*?deterministic\.', '', body)
        body = re.sub(r'\s*Sub-wave W\d+[a-e]:[^.]*\.', '', body)
        items[m.group(1)] = dict(id=m.group(1), title=title.group(2).strip(), zmieniaj=split_list(g('Zmieniaj')),
                                 wymagane=split_list(g('Wymagane')), verify=g('Weryfikacja'), body=body.strip())
    return items


def build_verify(files, item_cmds, extra, gate):
    parts = []
    stems = [os.path.basename(f)[:-3] for f in files if f.startswith('tests/Cuy.Core.Tests/') and f.endswith('Tests.cs')]
    kinds = ' && '.join(item_cmds)
    if gate and (stems or 'dotnet test' in kinds):
        parts.append('dotnet test %s -c Release' % TEST_PROJ)
    elif stems:
        parts.append('dotnet test %s -c Release --filter "%s"' % (TEST_PROJ, '|'.join('FullyQualifiedName~' + s for s in stems)))
    if 'dotnet build src/Cuy/' in kinds or (gate and stems):
        parts.append(BUILD)
    js = [f for f in files if f.endswith('.js') and (f.startswith('web/') or f.startswith('tools/qa/'))]
    parts += ['node --check ' + f for f in js]
    if 'web-smoke' in kinds or any(f.startswith('web/') and f.endswith('.js') for f in files):
        parts.append(SMOKE)
    for c in item_cmds:
        for piece in [p.strip() for p in c.split('&&')]:
            if piece.startswith('node tools/qa/') and 'web-smoke' not in piece and piece not in parts:
                parts.append(piece)
    for e in extra:
        if e not in parts:
            parts.append(e)
    return ' && '.join(parts) if parts else 'git diff --stat'


def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')[:44].rstrip('-')


def main():
    items = load_items()
    pk = {p['id']: p for p in SPEC['packages']}
    d = SPEC['defaults']
    def pkg_files(p):
        if p.get('manual'):
            return []
        ov = p.get('overrides', {})
        out = []
        for iid in p['items']:
            if iid in items:
                out += (ov.get(iid, {}).get('files') or items[iid]['zmieniaj'])
        return out
    # stage gate: the last package of the stage that has Core tests (else the last package of the stage)
    by_stage = collections.OrderedDict()
    for w in SPEC['waves']:
        m = re.match(r'W(\d+)', w['id'])
        if m:
            by_stage.setdefault(m.group(1), []).extend(w['packages'])
    gates = set()
    for st, pids in by_stage.items():
        core = [x for x in pids if any(f.startswith('tests/Cuy.Core.Tests/') for f in pkg_files(pk[x]))]
        gates.add((core or pids)[-1])
    errors = []
    assigned = collections.Counter()
    out_waves, summary = [], {}
    for w in SPEC['waves']:
        tasks = []
        for pid in w['packages']:
            p = pk[pid]
            if p.get('manual'):
                text = open(p['manual'], encoding='utf-8').read()
                files = split_list((re.search(r'^Zmieniaj:\s*(.*)$', text, re.M)).group(1))
                prompt_file, verify, title = p['manual'], p['verify'], p['title']
                n = 3
            else:
                its = []
                for iid in p['items']:
                    if iid not in items:
                        errors.append('%s: unknown item %s' % (pid, iid))
                        continue
                    if iid in SPEC['deferred']:
                        errors.append('%s: deferred item %s used' % (pid, iid))
                    assigned[iid] += 1
                    its.append(items[iid])
                ov = p.get('overrides', {})
                files, req, cmds, extra = [], [], [], []
                body = []
                for it in its:
                    o = ov.get(it['id'], {})
                    f = o.get('files') or it['zmieniaj']
                    for x in f:
                        if x not in files:
                            files.append(x)
                    for x in (o.get('files') or it['wymagane']):
                        if x not in req:
                            req.append(x)
                    if 'verify_extra' in o:
                        extra += o['verify_extra']
                    else:
                        cmds.append(it['verify'])
                    seg = '## Item %s: %s\nFiles of this item: %s\n%s\n' % (it['id'], it['title'], ', '.join(f), it['body'])
                    if o.get('note'):
                        seg += 'Package override (wins over anything above): %s\n' % o['note']
                    body.append(seg)
                verify = build_verify(files, cmds, extra, pid in gates)
                title = p['title']
                n = len(its)
                req = [x for x in req if x in files]
                slg = '%s-%s' % (pid, slug(title))
                prompt_file = 'docs/prompts/%s.md' % slg
                head = ['# %s: %s' % (pid, title),
                        'Zmieniaj: ' + ', '.join(files),
                        'Wymagane: ' + ', '.join(req) if req else None,
                        'Weryfikacja: ' + verify,
                        'Pytania: ' + QUESTIONS,
                        'Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj',
                        'Items (in this order): ' + ', '.join(i['id'] for i in its),
                        'Goal: ' + title + '.',
                        'Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". '
                        'If time runs out, finish and commit the current item and list the unfinished items in the PR. '
                        'Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.',
                        'Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).',
                        'Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.',
                        'PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.',
                        '']
                text = '\n'.join(h for h in head if h is not None) + '\n' + '\n'.join(body)
                open(prompt_file, 'w', encoding='utf-8').write(text)
            timeout = min(d['timeout_max'], d['timeout_base'] + d['timeout_per_item'] * max(1, n))
            tasks.append(dict(id=pid, title='%s: %s' % (pid, title), prompt_file=prompt_file, files=files,
                              test_command=verify, model=SPEC['models'][p['tier']], timeout_minutes=timeout))
            summary[pid] = dict(wave=w['id'], title=title, items=p['items'], files=files, verify=verify,
                                gate=pid in gates, model=SPEC['models'][p['tier']], timeout_minutes=timeout,
                                prompt_file=prompt_file)
        out_waves.append(dict(id=w['id'], tasks=tasks))
    # coverage: every item prompt is in exactly one package or deferred
    for iid in items:
        c = assigned[iid]
        if iid in SPEC['deferred']:
            if c:
                errors.append('%s deferred but assigned' % iid)
        elif c != 1:
            errors.append('%s assigned %d times' % (iid, c))
    # parallel waves must not share files
    for w in out_waves:
        seen = {}
        for t in w['tasks']:
            for f in t['files']:
                if f in seen:
                    errors.append('wave %s: %s shared by %s and %s' % (w['id'], f, seen[f], t['id']))
                seen[f] = t['id']
    if errors:
        print('\n'.join('ERROR ' + e for e in errors))
        sys.exit(1)
    # waves.yaml: keep the head (up to the first PK-00/W17 wave), replace the tail
    lines = open('waves.yaml', encoding='utf-8').read().split('\n')
    cut = next(i for i, l in enumerate(lines) if re.match(r'^- id: (PK-00|W17)\s*$', l))
    head = '\n'.join(lines[:cut]).rstrip('\n') + '\n'
    # PK-00 must come after W16 (head ends with W16); the tail starts with PK-00
    tail = yaml.safe_dump(out_waves, sort_keys=False, allow_unicode=True, width=100000, default_flow_style=False)
    open('waves.yaml', 'w', encoding='utf-8').write(head + tail)
    json.dump(dict(deferred=SPEC['deferred'], packages=summary), open('docs/opt/packages.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('packages: %d, items assigned: %d, deferred: %d, waves: %d' % (len(summary), sum(assigned.values()), len(SPEC['deferred']), len(out_waves)))


main()
