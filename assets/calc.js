/* 유틸덕 1인당 계산기. 규칙(notes/site-rules.md):
   - 함께 쓰는 사람(계정·프로필·추가 회원)과 동시 시청(기기 수)은 다른 한도로 계산한다.
   - 공식 한도를 넘는 조합은 금액을 하나도 보여 주지 않고 한도·이유·공식 출처만 보여 준다.
   - 금액마다 결제 조건(월간 결제 기준 / 연간 결제 월 환산)을 붙인다. */
(function (root) {
  function fmt(n, cur) {
    if (cur === 'USD') return 'US$' + (Math.round(n * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return Math.round(n).toLocaleString('ko-KR') + '원';
  }
  function monthly(p) { return p.period === '년' ? p.amount / 12 : p.amount; }
  function cond(p) { return p.billing === '월간 결제' ? '월간 결제 기준' : (p.billing === '무료' ? '무료' : '연간 결제 월 환산'); }
  // compute(plan, people, streams, adsExtra) -> {ok, total, per, n, s, warn:[], reasons:[]}
  function compute(p, n, s, adsExtra) {
    n = Math.max(1, Math.floor(n) || 1); s = Math.max(1, Math.floor(s) || 1);
    var m = monthly(p), w = [], r = [], total = m, per;
    var em = p.extra, st = p.sharing_type;
    if (st === 'seat') {
      if (n < 2 || n > 150) r.push('팀 요금제는 2~150명(시트)까지입니다. 입력한 인원 ' + n + '명은 공식 범위 밖입니다.');
      total = m * n;
    } else if (em) {
      var ex = adsExtra && em.price_with_ads ? em.price_with_ads : em.price;
      if (em.max !== null && em.max !== undefined) {
        if (n - 1 > em.max) r.push('함께 쓰는 사람은 ' + p.sharing_label + '까지입니다(본인 포함 최대 ' + (em.max + 1) + '명). 입력한 ' + n + '명은 이 한도를 넘습니다.');
      } else if (n > 1) {
        w.push('추가 회원 최대 인원이 공식 공지에 없어 미확인입니다. 가입 전 확인하세요.');
      }
      total = m + (n - 1) * ex;
    } else if (st === 'household' && p.max_people === 1) {
      if (n > 1) r.push('이 요금제는 ' + p.sharing_label + '입니다. 가구 밖 사람과 나눠 쓸 수 없습니다.');
    } else if (st === 'household') {
      if (n > 1) w.push('같은 가구 구성원끼리만 함께 쓸 수 있습니다(공식 유의사항). 가구 밖 사람과는 나눌 수 없습니다.');
    } else if (p.max_people && p.max_people > 1) {
      if (n > p.max_people) r.push('함께 쓰는 사람은 ' + p.sharing_label + '(최대 ' + p.max_people + '명)까지입니다. 입력한 ' + n + '명은 이 한도를 넘습니다.');
    } else if (p.max_people === 1 || st === 'individual') {
      if (n > 1) r.push('개인 요금제(1명)로 안내되어 여러 사람이 나눠 쓸 수 없습니다.');
    } else if (n > 1) {
      w.push('이 요금제의 공유 가능 인원이 공식 출처로 확인되지 않았습니다(미확인). 약관을 확인하세요.');
    }
    if (p.streams) {
      if (s > p.streams) r.push('동시 시청은 최대 ' + p.streams + '대입니다. 입력한 ' + s + '대는 이 한도를 넘습니다.');
    } else if (s > 1) {
      w.push('동시 시청 대수가 공식 출처로 확인되지 않았습니다(미확인).');
    }
    per = st === 'seat' ? m : total / n;
    var ok = r.length === 0;
    return { ok: ok, total: ok ? total : null, per: ok ? per : null, n: n, s: s, warn: w, reasons: r };
  }
  var api = { compute: compute, fmt: fmt, monthly: monthly, cond: cond };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UtilduckCalc = api;
  if (typeof document === 'undefined') return;

  var data = JSON.parse(document.getElementById('data').textContent);
  var $ = function (id) { return document.getElementById(id); };
  var svc = $('svc'), plan = $('plan'), ppl = $('ppl'), streams = $('streams'), warn = $('warn'), result = $('result'), basis = $('basis'), tbl = $('tbl'), limits = $('limits');
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  data.forEach(function (s) { var o = document.createElement('option'); o.value = s.id; o.textContent = s.name; svc.appendChild(o); });
  function cur() { return data.filter(function (s) { return s.id === svc.value; })[0]; }
  function fillPlans() {
    plan.innerHTML = '';
    cur().plans.forEach(function (p, i) {
      var o = document.createElement('option'); o.value = i;
      o.textContent = p.name + ' — ' + p.price_label;
      plan.appendChild(o);
    });
  }
  function srcLink(p) {
    return p.src_url ? '<a href="' + esc(p.src_url) + '" rel="noopener" target="_blank">' + esc(p.src_title || '공식 출처') + '</a>' + (p.src_checked ? ' (' + esc(p.src_checked) + ' 확인)' : '') : '공식 출처 없음';
  }
  function update() {
    var s = cur(), p = s.plans[+plan.value] || s.plans[0];
    $('extraTypeRow').hidden = !(p.extra && p.extra.price_with_ads);
    $('fxRow').hidden = p.currency !== 'USD';
    $('streamRow').hidden = !p.streams;
    if (!p.streams) streams.value = 1;
    var ads = $('extraType').value === 'ads';
    limits.innerHTML = '<strong>이 요금제의 공식 한도</strong> · 함께 쓰는 사람: ' + esc(p.sharing_label) + ' · 동시 시청: ' + (p.streams ? p.streams + '대' : '공식 표기 없음') + ' · 가격: ' + esc(p.price_label);
    var r = compute(p, +ppl.value, +streams.value, ads);
    warn.hidden = !r.ok || r.warn.length === 0; warn.textContent = r.warn.join(' ');
    if (!r.ok) {
      result.innerHTML = '<p class="blocked"><strong>이 조합은 공식 한도를 넘어 금액을 계산하지 않습니다.</strong></p><ul class="reasons">' +
        r.reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p class="small">공식 출처: ' + srcLink(p) + '</p>';
    } else {
      var c = cond(p), fx = +$('fx').value;
      var line = '월 총액 <strong>' + fmt(r.total, p.currency) + '/월</strong> · 1인당 월 <strong>' + fmt(r.per, p.currency) + '/월</strong> <span class="small">(' + c + ')</span>';
      if (p.currency === 'USD' && fx > 0) line += ' (입력한 환율 기준 1인당 약 ' + fmt(r.per * fx, 'KRW') + '/월 · ' + c + ')';
      line += '<br>1인당 연 환산 ' + fmt(r.per * 12, p.currency) + '/년 (' + r.n + '명 기준 · ' + c + ')';
      result.innerHTML = line;
    }
    basis.textContent = (p.basis ? '공유 인원 근거: ' + p.basis + '. ' : '') + (p.note ? p.note + ' ' : '') + (p.status === '부분확인' ? '이 가격은 부분확인입니다. ' : '');
    var h = '<table><thead><tr><th>함께 쓰는 사람</th><th>월 총액 · 결제 조건</th><th>1인당 월 · 결제 조건</th></tr></thead><tbody>';
    for (var i = 1; i <= 6; i++) {
      var k = compute(p, i, +streams.value, ads);
      h += '<tr><td>' + i + '명</td>' + (!k.ok
        ? '<td colspan="2" class="small">불가 · ' + esc(k.reasons[0]) + '</td>'
        : '<td class="num">' + fmt(k.total, p.currency) + '/월 · ' + cond(p) + '</td><td class="num">' + fmt(k.per, p.currency) + '/월 · ' + cond(p) + '</td>') + '</tr>';
    }
    tbl.innerHTML = h + '</tbody></table>';
  }
  function manual() {
    var pr = +$('mp').value, n = Math.max(1, Math.floor(+$('mn').value) || 1);
    $('mres').innerHTML = pr > 0 ? '1인당 월 <strong>' + fmt(pr / n, 'KRW') + '/월</strong> · 1인당 연 환산 ' + fmt(pr / n * 12, 'KRW') + '/년 (월 ' + fmt(pr, 'KRW') + ' ÷ ' + n + '명 · 입력한 월간 결제 금액 기준)' : '월 요금을 입력하면 계산됩니다.';
  }
  var q = new URLSearchParams(location.search);
  var hash = (q.get('s') || location.hash.replace('#', ''));
  if (hash && data.some(function (s) { return s.id === hash; })) svc.value = hash;
  fillPlans();
  if (q.get('p')) { var ix = cur().plans.map(function (x) { return x.id; }).indexOf(q.get('p')); if (ix >= 0) plan.value = ix; }
  if (q.get('n')) ppl.value = +q.get('n') || 1;
  if (q.get('d')) streams.value = +q.get('d') || 1;
  update(); manual();
  svc.addEventListener('change', function () { fillPlans(); ppl.value = 1; streams.value = 1; update(); });
  [plan, ppl, streams, $('extraType'), $('fx')].forEach(function (e) { e.addEventListener('input', update); e.addEventListener('change', update); });
  $('mp').addEventListener('input', manual); $('mn').addEventListener('input', manual);
})(typeof window !== 'undefined' ? window : globalThis);
