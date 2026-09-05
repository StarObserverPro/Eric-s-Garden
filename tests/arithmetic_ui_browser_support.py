"""Visible-reference and art evidence layered onto the real playability journey."""
import json
from pathlib import Path

EXPECTED = ["tomato", "corn", "lettuce", "2", "6"]
EQUATIONS = ["4 > 3", "3 > 2", "1 + 1 + 1 + 1 = 4", "3 − 1 = 2", "3 + 3 = 6"]
TARGETS = [dict(carrot=3,tomato=4,corn=1,pumpkin=2), dict(carrot=2,tomato=3,corn=3,pumpkin=2),
           dict(carrot=2,tomato=2,corn=2,pumpkin=2,lettuce=4), dict(carrot=2,tomato=3,corn=2,pumpkin=1,lettuce=4),
           dict(carrot=1,tomato=2,corn=2,pumpkin=1,lettuce=3,strawberry=3)]
KEY = 'eric-secret-garden-r2'


def activate(page, selector, touch):
    target = page.locator(selector)
    target.tap(timeout=8000) if touch else target.click(timeout=8000)
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')


def visible_packet(page, selector):
    """Checks actual hit-testing AND viewport/scroll clipping, not just DOM presence."""
    return page.locator(selector).evaluate_all('''els => els.map(el => {
      const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      const hit=document.elementFromPoint(x,y);
      let visible=r.width>0 && r.height>0 && r.x>=-1 && r.y>=-1 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;
      for(let p=el.parentElement;p;p=p.parentElement) {
        const s=getComputedStyle(p), b=p.getBoundingClientRect();
        if(/auto|scroll|hidden|clip/.test(s.overflowY)) visible &&= r.y>=b.y-1 && r.bottom<=b.bottom+1;
      }
      return {text:el.textContent,visible,hit:hit===el||el.contains(hit),x:r.x,y:r.y,w:r.width,h:r.height,font:parseFloat(getComputedStyle(el).fontSize)};
    })''')


def assert_owned_art(page, selector, name, out):
    """Non-empty SVG geometry alone misses intrinsic-size grid displacement.
    Both the SVG viewport AND the painted use must fit their owned cell.
    """
    packet = page.locator(selector).evaluate_all("""els => els.map(svg => {
      const box=r=>({x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom});
      const owner=svg.parentElement.getBoundingClientRect(), viewport=svg.getBoundingClientRect();
      const paint=svg.querySelector('use').getBoundingClientRect();
      const fits=r=>r.width>0&&r.height>0&&r.x>=owner.x-1&&r.y>=owner.y-1&&r.right<=owner.right+1&&r.bottom<=owner.bottom+1;
      return {art:svg.dataset.art,owner:box(owner),viewport:box(viewport),paint:box(paint),fits:fits(viewport)&&fits(paint)};
    })""")
    Path(out, name+'-art-bounds.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2))
    assert packet and all(item['fits'] for item in packet), ('art escaped its owned cell',packet)


def assert_workspace(page, name, out, answered=False):
    selectors = '.question-source,.question-title,.question-reference,.question-return'
    selectors += ',#questionBox .math-equation' if answered else ',#questionBox .answer-btn'
    packet = visible_packet(page, selectors)
    Path(out, name+'-question-geometry.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2))
    assert packet and all(x['visible'] and x['hit'] for x in packet), (name,'references/question obscured',packet)
    assert len(page.locator('dialog[open]').all()) == 1, 'nested dialog'
    assert page.locator('.notebook-card.is-portrait-open,.notebook-card.is-desktop-open').count() == 0
    assert page.locator('#statsSummary').is_hidden(), 'unrelated lifetime/stars still dominate question'
    assert page.locator('#statsDialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'), 'question overflow'
    buttons = visible_packet(page, '.question-return' if answered else '#questionBox .answer-btn,.question-return')
    assert all(x['h']>=44 and x['w']>=44 for x in buttons), 'small answer/return target'
    if answered:
        maths=visible_packet(page, '#questionBox .math-equation')
        assert all(x['font']>=26 for x in maths), 'result equation is still small print'
        assert_owned_art(page, '#questionBox .math-digit svg:visible,#questionBox .math-operator svg:visible', name, out)
    art = page.locator('#questionBox svg:visible use').evaluate_all('els=>els.map(e=>({w:e.getBBox().width,h:e.getBBox().height}))')
    assert art and all(a['w']>0 and a['h']>0 for a in art), 'runtime SVG did not paint'


def question_journey(page, touch, name, level, out, collected=False):
    original = page.evaluate('(key)=>localStorage.getItem(key)',KEY)
    activate(page,'#statsBtn',touch)
    drawer=page.locator('.portrait-notebook-stats:visible,.desktop-notebook-stats:visible')
    if drawer.count():
        drawer.tap() if touch else drawer.click()
    page.locator('#statsDialog[open]').wait_for()
    activate(page,'#questionBtn',touch)
    assert page.locator('#questionBox').get_attribute('data-source') == ('collected' if collected else 'target')
    references=page.locator('.question-reference').evaluate_all('els=>els.map(e=>({crop:e.dataset.crop,count:Number(e.dataset.count)}))')
    for ref in references:
        assert ref['count']==TARGETS[level][ref['crop']], (level,ref)
    assert page.locator('#questionBox .math-equation').count()==0, 'answer leaked before interaction'
    page.screenshot(path=str(Path(out,name+'-question.png')))
    assert_workspace(page,name,out)
    wrong=next(x for x in page.locator('#questionBox .answer-btn').evaluate_all('els=>els.map(e=>e.dataset.answer)') if x!=EXPECTED[level])
    activate(page,f'#questionBox [data-answer="{wrong}"]',touch)
    assert page.locator('#questionBox .math-equation').count()==0
    assert_workspace(page,name+'-retry',out)
    activate(page,f'#questionBox [data-answer="{EXPECTED[level]}"]',touch)
    assert page.locator('#questionBox .math-equation').get_attribute('aria-label')==EQUATIONS[level]
    page.screenshot(path=str(Path(out,name+'-math.png')))
    assert_workspace(page,name+'-result',out,True)
    assert references==page.locator('.question-reference').evaluate_all('els=>els.map(e=>({crop:e.dataset.crop,count:Number(e.dataset.count)}))'), 'answer discarded source counts'
    # Actual responsive reflow with the same open/answered question, not a mock.
    if level==0 and not collected:
        original_size=page.viewport_size
        for width,height in [(320,568),(844,390),(1024,768)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            assert_workspace(page,f'{name}-reflow-{width}',out,True)
            page.screenshot(path=str(Path(out,f'{name}-reflow-{width}.png')))
        page.set_viewport_size(original_size)
    activate(page,'.question-return',touch)
    assert page.locator('#questionBox').is_hidden()
    assert page.locator('#statsSummary').is_visible()
    assert page.locator('#statsBody .arithmetic-art').count()==len(TARGETS[level])
    assert page.locator('#questionBtn').evaluate('e=>e===document.activeElement'), 'back lost focus'
    activate(page,'#questionBtn',touch)
    assert page.locator('#questionBox .math-equation').count()==0, 'new question retained stale solution'
    # Escape closes the sole modal; reopening starts at the ordinary statistics.
    page.keyboard.press('Escape')
    assert not page.locator('#statsDialog').evaluate('e=>e.open')
    assert page.evaluate('(key)=>localStorage.getItem(key)',KEY)==original, 'learning mutated inventory/save/rewards'


def assert_sharing_recap(page, name, out):
    assert page.locator('.sharing-equation .math-equation').count()==2
    packet=visible_packet(page,'.sharing-result[data-equal="true"] .sharing-reference,.sharing-equation .math-equation')
    Path(out,name+'-math-geometry.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2))
    assert all(x['visible'] and x['hit'] for x in packet), ('sharing references/math obscured',packet)
    assert all(x['font']>=30 for x in visible_packet(page,'.sharing-equation .math-equation'))
    assert page.locator('#nextLevelBtn').evaluate('e=>getComputedStyle(e).position')=='static'
    assert_owned_art(page, '.sharing-token svg:visible,.sharing-equation .math-digit svg:visible,.sharing-equation .math-operator svg:visible', name, out)
