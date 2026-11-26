(function () {
  var data = JSON.parse(document.getElementById('data').textContent);
  var $ = function (id) { return document.getElementById(id); };
  var svc = $('svc'), plan = $('plan'), ppl = $('ppl'), warn = $('warn'), result = $('result'), basis = $('basis'), tbl = $('tbl');
  var fmt = function (n, cur) {
    if (cur === 'USD') return 'US$' + (Math.round(n * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return Math.round(n).toLocaleString('ko-KR') + '원';
  };
  data.forEach(function (s) { var o = document.createElement('option'); o.value = s.id; o.textContent = s.name; svc.appendChild(o); });
  function cur() { return data.filter(function (s) { return s.id === svc.value; })[0]; }
  function fillPlans() {
    plan.innerHTML = '';
    cur().plans.forEach(function (p, i) {
      var o = document.createElement('option'); o.value = i;
      o.textContent = p.name + ' — ' + fmt(p.amount, p.currency) + (p.from ? ' 부터' : '') + '/' + p.period;
      plan.appendChild(o);
    });
  }
  function monthly(p) { return p.period === '년' ? p.amount / 12 : p.amount; }
  // returns {total, per, n, warn, blocked}
  function calc(p, n, adsExtra) {
    var m = monthly(p), w = [], blocked = false;
    n = Math.max(1, Math.floor(n) || 1);
    var total;
    if (p.extra) {
      var ex = adsExtra && p.extra.price_with_ads ? p.extra.price_with_ads : p.extra.price;
      var maxExtra = p.extra.max;
      var extras = n - 1;
      if (maxExtra !== null && maxExtra !== undefined && extras > maxExtra) { blocked = true; w.push('이 요금제의 추가 회원은 최대 ' + maxExtra + '명(본인 포함 ' + (maxExtra + 1) + '명)입니다.'); }
      if ((maxExtra === null || maxExtra === undefined) && extras > 0) w.push('추가 회원 최대 인원이 공식 공지에 없어 미확인입니다. 가입 전 확인하세요.');
      total = m + extras * ex;
    } else if (p.max_people && p.max_people > 1) {
      if (n > p.max_people) { blocked = true; w.push('공식 안내상 최대 ' + p.max_people + '명까지입니다.'); }
      total = m;
    } else if (p.max_people === 1) {
      if (n > 1) { blocked = true; w.push('개인 요금제로 안내되어 인원을 나눌 수 없습니다. 약관상 공유는 허용되지 않을 수 있습니다.'); }
      total = m;
    } else {
      if (n > 1) w.push('이 요금제의 공유 가능 인원이 공식 출처로 확인되지 않았습니다(미확인). 약관을 확인하세요.');
      total = m;
    }
    return { total: total, per: total / n, n: n, warn: w, blocked: blocked };
  }
  function update() {
    var s = cur(), p = s.plans[+plan.value] || s.plans[0];
    var n = +ppl.value;
    $('extraTypeRow').hidden = !(p.extra && p.extra.price_with_ads);
    $('fxRow').hidden = p.currency !== 'USD';
    var r = calc(p, n, $('extraType').value === 'ads');
    warn.hidden = r.warn.length === 0; warn.textContent = r.warn.join(' ');
    var fx = +$('fx').value;
    var line = '월 총액 <strong>' + fmt(r.total, p.currency) + '</strong> · 1인당 월 <strong>' + fmt(r.per, p.currency) + '</strong>';
    if (p.currency === 'USD' && fx > 0) line += ' (입력한 환율 기준 약 ' + fmt(r.per * fx, 'KRW') + ')';
    line += '<br>1인당 연 환산 ' + fmt(r.per * 12, p.currency) + ' (' + r.n + '명 기준';
    if (p.period === '년') line += ', 연간 요금을 12로 나눈 월 환산';
    line += ')';
    if (r.blocked) line = '<span class="unk">선택한 인원은 이 요금제에서 공식적으로 쓸 수 없습니다.</span><br>참고 계산: ' + line;
    result.innerHTML = line;
    var b = (p.basis ? '공유 인원 근거: ' + p.basis + '. ' : '') + (p.note ? p.note + ' ' : '') + (p.status === '부분확인' ? '이 가격은 부분확인입니다. ' : '');
    basis.textContent = b;
    // table for 1..6
    var h = '<table><thead><tr><th>인원</th><th>월 총액</th><th>1인당 월</th></tr></thead><tbody>';
    for (var i = 1; i <= 6; i++) {
      var c = calc(p, i, $('extraType').value === 'ads');
      h += '<tr><td>' + i + '명</td>' + (c.blocked ? '<td colspan="2" class="small">불가(공식 안내 기준)</td>' : '<td class="num">' + fmt(c.total, p.currency) + '</td><td class="num">' + fmt(c.per, p.currency) + '</td>') + '</tr>';
    }
    tbl.innerHTML = h + '</tbody></table>';
  }
  function manual() {
    var pr = +$('mp').value, n = Math.max(1, Math.floor(+$('mn').value) || 1);
    $('mres').innerHTML = pr > 0 ? '1인당 월 <strong>' + fmt(pr / n, 'KRW') + '</strong> · 1인당 연 환산 ' + fmt(pr / n * 12, 'KRW') + ' (월 ' + fmt(pr, 'KRW') + ' ÷ ' + n + '명)' : '월 요금을 입력하면 계산됩니다.';
  }
  var hash = (new URLSearchParams(location.search).get('s') || location.hash.replace('#', ''));
  if (hash && data.some(function (s) { return s.id === hash; })) svc.value = hash;
  fillPlans(); update(); manual();
  svc.addEventListener('change', function () { fillPlans(); var s = cur(); var p = s.plans[0]; ppl.value = 1; update(); });
  [plan, ppl, $('extraType'), $('fx')].forEach(function (e) { e.addEventListener('input', update); e.addEventListener('change', update); });
  $('mp').addEventListener('input', manual); $('mn').addEventListener('input', manual);
})();
