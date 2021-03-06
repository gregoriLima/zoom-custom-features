function criarDomListener() {
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver((mutations, observer) => atualizarTela());

    observer.observe(
        document.getElementById('wc-container-right'),
        {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true
        }
    );
}

async function enviarEmail() {
    let endereco = '';
    let emCopia = '';
    let assistencia = 0;
    try {
        /* Hospedagem json: https://www.npoint.io/docs/82ac381d78c352771131 */
        /* Servico email: https://formsubmit.co/ */
        const dadosEmail = await fetch('https://api.npoint.io/82ac381d78c352771131/v1').then(res => res.json());
        endereco = dadosEmail.endpoint;
        emCopia = dadosEmail.emails.join(',');
        assistencia = contarAssistencia().contados;
    } catch (erro) {
        console.error('Não foi possível enviar e-mail.', erro);
    }

    const iFrameHack = document.querySelector('#iframe-enviar-email') || document.createElement('iframe');
    iFrameHack.id = 'iframe-enviar-email';
    iFrameHack.name = 'iframe-enviar-email';
    iFrameHack.style.cssText = 'width: 0; height: 0; border: 0; display: none;';

    const formEmail = document.querySelector('#form-enviar-email') || document.createElement('form');
    formEmail.querySelectorAll('*').forEach(ipt => ipt.remove());
    formEmail.id = 'form-enviar-email';
    formEmail.name = 'form-enviar-email';
    formEmail.style.display = 'none';
    formEmail.method = 'post';
    formEmail.target = 'iframe-enviar-email';
    formEmail.action = endereco;

    const hoje = new Date().toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }).split(', ').reverse().join(' - ');
    const fields = [
        { type: 'text', name: 'assistencia', value: assistencia },
        { type: 'text', name: 'congregacao', value: 'nordeste' },
        { type: 'text', name: 'data', value: hoje },
        { type: 'text', name: '_template', value: 'table' },
        { type: 'text', name: '_subject', value: `Assistência Nordeste - ${hoje}` },
        { type: 'hidden', name: '_cc', value: emCopia },
        { type: 'hidden', name: '_captcha', value: 'false' }
    ];

    fields.forEach(f => {
        let input = document.createElement('input');
        input.type = f.type;
        input.name = f.name;
        input.value = f.value;
        formEmail.appendChild(input);
    });

    document.body.appendChild(iFrameHack);
    document.body.appendChild(formEmail);
    formEmail.submit();
}

function validarVideosLigadosNaAssistencia() {
    abrirPainelParticipantes();
    avisosDeRotinas['validarVideosLigadosNaAssistencia'] = getParticipantes().reduce((lista, participante) => {
        if (isVideoLigado(participante)) {
            lista.push(getNomeParticipante(participante));
        }
        return lista;
    }, []);
}

function admitirEntradaNaSalaComNomeValido() {
    abrirPainelParticipantes();
    const invalidos = [];
    Array.from(document.querySelectorAll('.waiting-room-list-conatiner__ul li')).forEach(participante => {
        const nome = getNomeParticipante(participante);
        /* verificar se participante tem nome valido */
        if (isNomeValido(participante)) {
            participante.dispatchEvent(criarEventoMouseOver());
            /* selecionar botao que permite entrada do participante */
            const btnPermitir = participante.querySelector('.btn-primary');
            if (btnPermitir) {
                btnPermitir.click();
            }
        } else {
            invalidos.push(nome);
        }
    });
    /* criar uma nova lista com todos participantes invalidos */
    avisosDeRotinas['registrarEntradaNaSalaComNomeInvalido'] = invalidos;
}

function validarNomesForaDoPadrao() {
    abrirPainelParticipantes();
    const nomesInvalidos = [];

    getParticipantes().forEach(participante => {
        const nome = getNomeParticipante(participante);
        /* busca por: parenteses, chaves ou colchetes (com ou sem espaco) seguido do numero de pessoas */
        if (!isNomeValido(participante)) {
            nomesInvalidos.push(nome);
        }
    });

    avisosDeRotinas['validarNomesForaDoPadrao'] = nomesInvalidos;
}

function getNomeRotina(id) {
    return {
        tentativasPersistentes: 'Rotinas em andamento (click para abortar)',
        validarVideosLigadosNaAssistencia: 'Vídeos ligados na assistência',
        validarNomesForaDoPadrao: 'Nomes inválidos na assistência',
        registrarEntradaNaSalaComNomeInvalido: 'Nomes inválidos (mantidos na sala de espera)',
        botoesFocoCustomizado: 'Botões de foco customizado (Útil para a reunião de semana)'
    }[id];
}

function atualizarTela() {
    limparAvisosAntigos();
    validarNomesForaDoPadrao();
    admitirEntradaNaSalaComNomeValido();
    validarVideosLigadosNaAssistencia();
    atualizarAssistencia();
    atualizarAvisosDeRotinas();
}

function interromperSolicitaoPersistente(idSolicitacao) {
    avisosDeRotinas['tentativasPersistentes'] = avisosDeRotinas['tentativasPersistentes'].filter(id => id != idSolicitacao);
    encerrarRotina(idSolicitacao);
    atualizarTentativasPersistentes();
}

function atualizarTentativasPersistentes() {
    const ul = document.getElementById(btoa('tentativasPersistentes'));
    ul.querySelectorAll('li').forEach(li => li.remove());

    avisosDeRotinas['tentativasPersistentes'].forEach(alvo => {
        const check = document.createElement('input');
        check.setAttribute('type', 'checkbox');
        check.setAttribute('value', alvo);
        check.onclick = (e) => interromperSolicitaoPersistente(e.target.value);

        const li = document.createElement('li');
        li.innerText = alvo;
        li.setAttribute('class', 'checkbox');
        li.appendChild(check);

        ul.appendChild(li);
    });
}

function atualizarBotoesFocoCustomizado() {
    const ul = document.getElementById(btoa('botoesFocoCustomizado'));
    ul.querySelectorAll('li').forEach(li => li.remove());

    avisosDeRotinas['botoesFocoCustomizado'].forEach(btnCustomizado => {
        const btn = document.createElement('button');
        btn.innerText = btnCustomizado.alvo;
        btn.setAttribute('class', 'btn btn-danger');
        btn.onclick = () => btnCustomizado.click();

        const icon = criarIcone('fechar');
        icon.onclick = () => excluirBotaoFocoCustomizado(btnCustomizado.id);
        icon.style.cssText = `
            font-size: 30px;
            cursor: pointer;
        `;

        const li = document.createElement('li');
        li.style.cssText = `
            display: grid;
            grid-template-columns: auto 1fr;
            max-height: 55px;
            align-items: center;
        `;

        li.appendChild(btn);
        li.appendChild(icon);
        ul.appendChild(li);
    });
}

function atualizarAvisosDeRotinas() {
    Object.keys(avisosDeRotinas).forEach(rotina => {
        const novoCache = btoa(avisosDeRotinas[rotina].join(''));

        /* atualizar lista somente se tiver novos dados */
        if (cache[rotina] !== novoCache) {
            const ulRotina = document.getElementById(btoa(rotina));

            /* limpar feed de logs antigos */
            ulRotina.querySelectorAll('li').forEach(li => li.remove());

            if (rotina == 'tentativasPersistentes') {
                atualizarTentativasPersistentes();
                return;
            }

            if (rotina == 'botoesFocoCustomizado') {
                atualizarBotoesFocoCustomizado();
                return;
            }

            /* repopular lista */
            avisosDeRotinas[rotina].forEach(aviso => {
                const li = document.createElement('li');
                li.setAttribute('class', 'checkbox');
                li.innerText = aviso;
                ulRotina.appendChild(li);
            });

            /* atualizar cache */
            cache[rotina] = novoCache;
        }
    });
}

function atualizarAssistencia() {
    const dadosAssistencia = contarAssistencia();
    const novoCache = btoa(JSON.stringify(dadosAssistencia));
    /* atualizar lista somente se com novas informacoes */
    if (cache['atualizarAssistencia'] !== novoCache) {
        document.getElementById(idTextoContados).innerText = `${dadosAssistencia.contados} identificado(s)`;
        document.getElementById(idTextoNaoContados).innerText = `${dadosAssistencia.naoContados} não identificado(s)`;
        /* atualizar cache */
        cache['atualizarAssistencia'] = novoCache;
    }
}

function limparAvisosAntigos() {
    Object.keys(avisosDeRotinas).forEach(rotina => {
        if (rotina != 'tentativasPersistentes' && avisosDeRotinas[rotina].length > 10) {
            const avisosUnicos = Array.from(new Set(avisosDeRotinas[rotina]));
            avisosDeRotinas[rotina] = avisosUnicos.slice(-10);
        }
    });
}

function dispararRotina(nomeRotina, tempoEmMilissengudos, callback) {
    encerrarRotina(nomeRotina);
    intervalosEmExecucao[nomeRotina] = setInterval(() => callback(), tempoEmMilissengudos);
}

function encerrarRotina(nomeRotina) {
    intervalosEmExecucao[nomeRotina] = clearInterval(intervalosEmExecucao[nomeRotina]);
}

function criarBotaoOpcoesCustomizadas() {
    const idBotao = 'abrir-opcoes-reuniao';
    const btnAntigo = document.getElementById(idBotao);

    /* remover botao da barra de acoes do zoom ao reexecutar script */
    if (btnAntigo) btnAntigo.remove();

    /* recriar o botao ao executar script para manter atualizado */
    const btnOpcoesCustomizadas = document.createElement('button');
    btnOpcoesCustomizadas.id = idBotao;
    btnOpcoesCustomizadas.innerText = 'Opções customizadas';
    btnOpcoesCustomizadas.style.marginRight = '20px';
    btnOpcoesCustomizadas.onclick = alternarModal;
    /* adicionar botao na barra de acoes do zoom */
    document.querySelector('#wc-footer').appendChild(btnOpcoesCustomizadas);
}

function desenharModal() {
    const modal = document.getElementById(idModal);
    /* limpar componentes anteriores */
    if (modal) modal.remove();

    const painelOpcoes = desenharPainelPrincipal();
    /* esconder modal ao iniciar script */
    painelOpcoes.style.display = 'none';
    /* adicionar na tela */
    document.body.appendChild(painelOpcoes);
}

function desenharPainelPrincipal() {
    /* importar icones */
    importarIconesFontAwesome();

    /* construir o quadro inteiro do painel */
    const painelOpcoes = document.createElement('div');
    painelOpcoes.id = idModal;
    painelOpcoes.setAttribute('class', 'modal-principal');

    /* adicionar os frames ao painel */
    painelOpcoes.appendChild(desenharFrameBotoes());
    painelOpcoes.appendChild(desenharFrameServicos());
    return painelOpcoes;
}

function desenharFrameBotoes() {
    const funcionalidades = [
        {
            nome: 'Ligar vídeos e som',
            icone: 'camera,microfone',
            classe: 'btn-danger',
            click: ligarTudo,
            confirmar: 'Tem certeza que deseja LIGAR TODOS OS VÍDEOS E MICROFONES?'
        },
        {
            nome: 'Desligar vídeos e som',
            icone: 'cameraFechada,microfoneFechado',
            classe: 'btn-danger',
            click: desligarTudo,
            confirmar: 'Tem certeza que deseja DESLIGAR TODOS OS VÍDEOS E MICROFONES?'
        },
        {
            nome: `Palmas (ativa por ${tempoDePalmas / 1000}s)`,
            icone: 'microfone',
            classe: 'btn-danger btn-palmas',
            click: liberarPalmas,
            confirmar: `Tem certeza que deseja LIBERAR AS PALMAS?\n\nOs microfones ficarão ligados por ${tempoDePalmas / 1000} segundos.`
        },
        {
            nome: 'Finalizar discurso',
            icone: 'finalizarDiscurso',
            classe: 'btn-danger',
            click: finalizarDiscurso,
            confirmar: 'Tem certeza que deseja FINALIZAR O DISCURSO?\n\nOs microfones serão ligados (por alguns segundos) para as palmas e o presidente será acionado após as palmas.'
        },
        {
            nome: 'Focar no presidente',
            icone: 'presidente',
            classe: 'btn-primary',
            click: focarNoPresidente
        },
        {
            nome: 'Focar no orador',
            icone: 'orador',
            classe: 'btn-primary',
            click: focarNoOrador
        },
        {
            nome: 'Focar no dirigente',
            icone: 'dirigente',
            classe: 'btn-primary',
            click: focarNoDirigente
        },
        {
            nome: 'Focar no leitor',
            icone: 'leitor',
            classe: 'btn-primary',
            click: focarNoLeitor
        },
        {
            nome: 'Criar botão de foco customizado por nome',
            icone: 'participante',
            classe: 'btn-success full',
            click: criarFocoCustomizado
        },
    ];

    /* construir botoes principais */
    const criarBotao = ({ nome, confirmar, click, classe, icone }) => {
        const btn = document.createElement('button');
        btn.innerText = nome;
        btn.onclick = () => !confirmar ? click() : confirm(`CUIDADO!\n\n${confirmar}\n\nClique em cancelar para desfazer`) && click();
        btn.setAttribute('class', `btn ${classe} btn-funcionalidade`);

        if (icone) {
            const div = document.createElement('div');
            icone.split(',').forEach(i => div.appendChild(criarIcone(i)));
            btn.appendChild(div);
        }
        return btn;
    };

    /* contagem da assistencia na ultima linha */
    const dadosAssistencia = contarAssistencia();

    const textoContados = document.createElement('span');
    textoContados.id = idTextoContados;
    textoContados.innerText = `${dadosAssistencia.contados} identificado(s)`;

    const textoNaoContados = document.createElement('span');
    textoNaoContados.id = idTextoNaoContados;
    textoNaoContados.innerText = `${dadosAssistencia.naoContados} não identificado(s)`;

    const iconContados = criarIcone('assistencia');
    iconContados.style.color = '#5cb85c';

    const iconNaoContados = criarIcone('assistenciaNaoContada');
    iconNaoContados.style.color = '#ff4242';

    const divContados = document.createElement('div');
    divContados.setAttribute('class', 'configuracao');
    divContados.appendChild(iconContados);
    divContados.appendChild(textoContados);
    divContados.style.cursor = 'pointer';
    divContados.onclick = () => {
        const c = contarAssistencia();
        if (confirm(`Deseja enviar email ao secretário informando assistência de ${c.contados}?`)) {
            enviarEmail();
        }
    };

    const divNaoContados = document.createElement('div');
    divNaoContados.setAttribute('class', 'configuracao');
    divNaoContados.appendChild(iconNaoContados);
    divNaoContados.appendChild(textoNaoContados);

    const inputModoTransparente = document.createElement('input');
    inputModoTransparente.id = 'modo-transparente';
    inputModoTransparente.setAttribute('type', 'checkbox');
    inputModoTransparente.onchange = (evento) => alternarModoTransparente(evento);

    const textoModoTransparente = document.createElement('label');
    textoModoTransparente.setAttribute('for', 'modo-transparente');
    textoModoTransparente.innerText = 'Ativar modo transparente (revela vídeo em destaque)';

    const divModoTransparente = document.createElement('div');
    divModoTransparente.setAttribute('class', 'configuracao config-item');
    divModoTransparente.appendChild(inputModoTransparente);
    divModoTransparente.appendChild(textoModoTransparente);

    /* construtir o frame com botoes */
    const frameBotoes = document.createElement('div');
    frameBotoes.setAttribute('class', 'frame-funcionalidades');

    /* adicionar os botoes no frame */
    funcionalidades.forEach(f => frameBotoes.appendChild(criarBotao(f)));
    frameBotoes.appendChild(divContados);
    frameBotoes.appendChild(divNaoContados);
    frameBotoes.appendChild(divModoTransparente);
    return frameBotoes;
}

function desenharFrameServicos() {
    /* bloco dos servicos */
    const servicos = document.createElement('div');
    servicos.id = 'rotinas-background';
    servicos.setAttribute('class', 'frame-rotinas');

    /* botao fechar modal */
    const btnFechar = criarIcone('fechar', 'btn-fechar-modal');
    btnFechar.onclick = fecharModal;
    btnFechar.classList.add('btn-fechar');

    /* titulo das rotinas */
    const titulo = document.createElement('h3');
    titulo.style.textAlign = 'center';
    titulo.innerText = 'O que está acontecendo agora';

    /* criar listas de logs das rotinas */
    Object.keys(avisosDeRotinas).forEach(rotina => {
        const div = document.createElement('div');
        const tituloRotina = document.createElement('p');
        const ul = document.createElement('ul');

        /* adicionar titulo na sessao */
        tituloRotina.setAttribute('class', 'titulo-lista-rotina');
        tituloRotina.innerText = getNomeRotina(rotina);
        div.appendChild(tituloRotina);

        /* botoes de foco customizado */
        if (rotina == 'botoesFocoCustomizado') {
            avisosDeRotinas[rotina].forEach(btnCustomizado => {
                const btn = document.createElement('button');
                btn.setAttribute('class', 'btn btn-danger');
                btn.setAttribute('value', btnCustomizado.alvo);
                btn.onclick = () => btnCustomizado.click();
                const li = document.createElement('li');
                li.appendChild(btn);
                ul.appendChild(li);
            });
        }

        /* adicionar lista na sessao */
        ul.id = btoa(rotina);
        div.appendChild(ul);

        /* adiciona sessao na lista */
        servicos.appendChild(div);
    });

    /* construtir o frame com servicos */
    const frameServicos = document.createElement('div');
    frameServicos.appendChild(btnFechar);
    frameServicos.appendChild(titulo);
    frameServicos.appendChild(servicos);
    return frameServicos;
}

function criarCss() {
    abrirPainelParticipantes();
    const larguraPainelParticipantes = parseInt(document.querySelector('#wc-container-right').style.width);
    const alturaBotoesRodape = document.querySelector('#wc-footer').clientHeight;
    const maiorZIndex = Math.max.apply(null, Array.from(document.querySelectorAll('body *')).map(({ style = {} }) => style.zIndex || 0));
    const css = document.getElementById('estilo-customizado') || document.createElement('style');
    css.id = 'estilo-customizado';
    css.innerHTML = `
        .modal-principal {
            display: grid;
            grid-template-columns: 2fr 3fr;
            overflow-y: scroll;
            position: fixed;
            right: ${larguraPainelParticipantes + 5}px;
            left: 5px;
            top: 20px;
            bottom: ${alturaBotoesRodape + 10}px;
            background-color: #edf2f7e6;
            border-radius: 10px;
            font-size: 12px;
            z-index: ${maiorZIndex + 2};
        }
        .modal-transparente {
            background-color: #ffffff11;
        }
        .modal-transparente * {
            color: #ffffffbb;
        }
        .btn-fechar {
            position: absolute;
            right: 0px;
            top: 5px;
            opacity: 0.7;
            cursor: pointer;
            color: #ff4242;
            font-size: 45px !important;
        }
        .frame-rotinas {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 33% 33% 34%;
            min-height: 90%;
            padding-bottom: 10px;
        }
        .frame-funcionalidades {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(7, 1fr);
            gap: 5px;
            padding: 0;
            margin: 5px;
        }
        .btn-funcionalidade {
            display: flex;
            flex-direction: column-reverse;
            justify-content: space-evenly;
            align-items: center;
            padding: 0;
            font-size: 14px;
            opacity: 0.8;
        }
        .btn-funcionalidade.full {
            flex-direction: row-reverse;
            grid-column: span 2;
        }
        .configuracao {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border-radius: 4px;
            color: #ffffff;
            background-color: #23272b;
        }
        .config-item {
            grid-column: span 2;
            font-size: 12px;
        }
        .config-item * {
            margin: 0;
            padding: 0;
            user-select: none;
            cursor: pointer;
        }
        .config-item input {
            margin: 0;
            margin-right: 10px;
        }
        .titulo-lista-rotina {
            margin: 0px 5px;
            background-color: #23272b;
            text-align: center;
            color: white;
        }
        .titulo-lista-rotina + ul {
            list-style-type: none;
            overflow-y: scroll;
            height: 135px;
            padding: 0px;
            margin: 0px 10px;
        }
        .titulo-lista-rotina + ul li {
            padding-top: 10px;
            padding-bottom: 10px;
        }
        .titulo-lista-rotina + ul li.checkbox {
            display: flex;
            flex-direction: row-reverse;
            align-items: center;
            justify-content: flex-end;
        }
        .titulo-lista-rotina + ul li.checkbox input {
            margin-right: 10px;
        }
        .titulo-lista-rotina + ul::-webkit-scrollbar-thumb {
            background-color: #23272b2e;
            border-radius: 10px;
        }
        .titulo-lista-rotina + ul li:nth-child(2n) {
            background-color: #c1c2c38a;
        }
        #rotinas-background > :last-child {
            grid-column: span 2;
        }
        #rotinas-background > :last-child > ul {
            display: grid;
            grid-template-columns: auto auto auto auto;
            opacity: 0.8;
        }
        #rotinas-background > :last-child li {
            background-color: unset;
        }
    `;
    document.body.appendChild(css);
}

function importarIconesFontAwesome() {
    const importIcones = document.querySelector('#icones');
    /* nao duplicar tag de import dos icones */
    if (!importIcones) {
        const link = document.createElement('link');
        link.setAttribute('href', 'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('id', 'icones');
        document.head.appendChild(link);
    }
}

function criarIcone(tipo, id) {
    if (!tipo) return;

    const tipos = {
        camera: 'videocam',
        cameraFechada: 'videocam_off',
        microfone: 'mic_none',
        microfoneFechado: 'mic_off',
        orador: 'record_voice_over',
        finalizarDiscurso: 'voice_over_off',
        presidente: 'person',
        participante: 'person_add',
        dirigente: 'group',
        leitor: 'supervisor_account',
        assistencia: 'airline_seat_recline_normal',
        assistenciaNaoContada: 'airline_seat_recline_extra',
        cadeado: 'lock',
        desativado: 'toggle_off',
        ativado: 'toggle_on',
        fechar: 'cancel',
    };
    const icone = document.createElement('i');
    icone.id = id || btoa(Math.random());
    icone.setAttribute('class', 'material-icons-outlined');
    icone.style.fontSize = '35px';
    icone.innerText = tipos[tipo];
    return icone;
}

function alternarModal() {
    const modal = document.getElementById(idModal);
    if (modal.style.display == 'none') {
        modal.removeAttribute('style');
    } else {
        fecharModal();
    }
}

function fecharModal() {
    document.getElementById(idModal).style.display = 'none';
}

function alternarModoTransparente(evento) {
    const modal = document.getElementById(idModal);
    if (evento.target.checked) {
        modal.classList.add('modal-transparente');
    } else {
        modal.classList.remove('modal-transparente');
    }
}

function abrirPainelParticipantes() {
    if (!document.querySelector('.participants-header__title')) {
        document.querySelector('.footer-button__participants-icon').click();
        criarDomListener();
    }
}

function iniciarEventosPainelParticipantes() {
    const btnAbrirPainel = document.querySelector('.footer-button__participants-icon');

    if (!document.getElementById('wc-container-right')) {
        btnAbrirPainel.click();
    }

    criarDomListener();
    btnAbrirPainel.click();
}

function getParticipantes() {
    return Array.from(document.querySelectorAll('.participants-ul .item-pos.participants-li'));
}

function getNomeParticipante(participante) {
    return !participante ? '' : participante.querySelector('.participants-item__display-name').innerText;
}

function getBotoesDropdown(participante) {
    return !participante ? [] : Array.from(participante.querySelectorAll('.participants-item__buttons .dropdown-menu a'));
}

function criarEventoMouseOver() {
    const eventoFalsoDeMouseOver = new MouseEvent('mouseover', { bubbles: true });
    eventoFalsoDeMouseOver.simulated = true;
    return eventoFalsoDeMouseOver;
}

function selecionarParticipante(funcao) {
    return getParticipantes().find(participante => {
        const nome = getNomeParticipante(participante);
        return nome && nome.toLowerCase().includes(funcao);
    });
}

function isNomeValido(participante) {
    const nome = getNomeParticipante(participante);
    /* valida se nome comeca com (ou [ ou {, seguido de 0 a 9 */
    const regexPadrao = /^\s*[\(\[\{]\s*[0-9]/i;
    const dispositivos = [
        'galaxy',
        'note',
        'samsung',
        'apple',
        'huawei',
        'xiaomi',
        'oppo',
        'vivo',
        'lg',
        'lenovo',
        'motorola',
        'moto',
        'nokia',
        'tecno'
    ];
    /* texto deve conter nome [marca/dispositivo nao sao validos], quantidade [formato: "(x) nome pessoa"] */
    return nome
        && regexPadrao.test(nome)
        && nome.split(' ').filter(p => !dispositivos.includes(p.toLowerCase())).length == nome.split(' ').length;
}

function isMicrofoneLigado(participante) {
    if (!participante) return false;
    participante.dispatchEvent(criarEventoMouseOver());
    return Array
        .from(participante.querySelectorAll('.participants-item__buttons button'))
        .some(btn => textoDesligarMicrofone.includes(btn.innerText.toLowerCase()));
}

function isVideoLigado(participante) {
    if (!participante) return false;
    participante.dispatchEvent(criarEventoMouseOver());
    return getBotoesDropdown(participante).some(btn => textoPararVideo.includes(btn.innerText.toLowerCase()));
}

function isSpotlightLigado(participante) {
    if (!participante) return false;
    participante.dispatchEvent(criarEventoMouseOver());
    return getBotoesDropdown(participante).some(btn => textoCancelarSpotlight.includes(btn.innerText.toLowerCase()));
}

function clickBotao(participante, textosBotao) {
    if (!participante) {
        atualizarTela();
        return;
    }
    participante.dispatchEvent(criarEventoMouseOver());
    Array.from(participante.querySelectorAll('.participants-item__buttons button')).some(btn => (
        btn && textosBotao.includes(btn.innerText.toLowerCase()) && !btn.click()
    ));
}

function clickDropdown(participante, textosBotao) {
    if (!participante) {
        atualizarTela();
        return;
    }
    participante.dispatchEvent(criarEventoMouseOver());
    getBotoesDropdown(participante).some(btn => {
        if (textosBotao.includes(btn.innerText.toLowerCase())) {
            btn.click();
            return true;
        }
    });
}

function ligarMicrofoneParticipante(participante, tentativaPersistente) {
    const nomeRotina = `ligar_som_${getNomeParticipante(participante)}`;

    /* cancelar nova tentativa se participante ja ligou microfone */
    if (isMicrofoneLigado(participante)) {
        encerrarRotina(nomeRotina);
        atualizarTela();
        return;
    }

    clickBotao(participante, textoLigarMicrofone);

    if (participante && tentativaPersistente) {
        /* iniciar temporizador para aguardar participante liberar microfone */
        dispararRotina(nomeRotina, 2000, () => {
            if (isMicrofoneLigado(participante)) {
                avisosDeRotinas['tentativasPersistentes'] = avisosDeRotinas['tentativasPersistentes'].filter(tentativa => tentativa != nomeRotina);
                encerrarRotina(nomeRotina);
                atualizarTela();
            } else {
                /* registrar log de tentativa em andamento */
                if (!avisosDeRotinas['tentativasPersistentes'].includes(nomeRotina)) {
                    avisosDeRotinas['tentativasPersistentes'].push(nomeRotina);
                    atualizarTela();
                }

                clickBotao(participante, textoLigarMicrofone);
            }
        });
    }
}

function desligarMicrofoneParticipante(participante) {
    clickBotao(participante, textoDesligarMicrofone);
}

function ligarVideoParticipante(participante, callback) {
    /* se o video ja estiver ligado, seguir para proximas instrucoes */
    if (isVideoLigado(participante)) return callback && callback();

    const textosBotao = ['ask for start video', 'start video', 'pedir para iniciar vídeo', 'iniciar vídeo'];

    clickDropdown(participante, textosBotao);

    /* se houverem instrucoes para executar apos video ser ligado, ativa um temporizador */
    if (participante && callback) {
        const nomeRotina = `ligar_video_${getNomeParticipante(participante)}`;

        /* iniciar temporizador para aguardar participante liberar video */
        let repeticoes = 0;
        dispararRotina(nomeRotina, 500, () => {
            repeticoes++;
            if (isVideoLigado(participante)) {
                avisosDeRotinas['tentativasPersistentes'] = avisosDeRotinas['tentativasPersistentes'].filter(aviso => aviso != nomeRotina);
                encerrarRotina(nomeRotina);
                atualizarTela();
                callback();
            } else {
                /* registrar log de tentativa em andamento */
                if (!avisosDeRotinas['tentativasPersistentes'].includes(nomeRotina)) {
                    avisosDeRotinas['tentativasPersistentes'].push(nomeRotina);
                    atualizarTela();
                }
                /* aguardar tempo suficiente para nova tentativa */
                if (repeticoes >= 8) {
                    repeticoes = 0;
                    clickDropdown(participante, textosBotao);
                }
            }
        });
    }
}

function desligarVideoParticipante(participante) {
    clickDropdown(participante, textoPararVideo);
}

function spotlightParticipante(participante) {
    clickDropdown(participante, ['spotlight video', 'vídeo de destaque']);
}

function desligarSpotlight() {
    abrirPainelParticipantes();
    getParticipantes().some(participante => {
        if (isSpotlightLigado(participante)) {
            clickDropdown(participante, textoCancelarSpotlight);
            return true;
        }
    });
}

function ligarMicrofones() {
    abrirPainelParticipantes();
    getParticipantes().forEach(participante => ligarMicrofoneParticipante(participante));
}

function desligarMicrofones(execoes) {
    abrirPainelParticipantes();
    execoes = Array.isArray(execoes) ? execoes.map(p => getNomeParticipante(p)) : [];

    getParticipantes().forEach(participante => {
        /* silenciar todos participantes que nao estejam na lista de excecoes */
        if (!execoes.includes(getNomeParticipante(participante))) {
            desligarMicrofoneParticipante(participante);
        }
    });
}

function desligarVideos(execoes) {
    abrirPainelParticipantes();
    execoes = Array.isArray(execoes) ? execoes.map(p => getNomeParticipante(p)) : [];

    getParticipantes().forEach(participante => {
        /* desligar video de todos participantes que nao estejam na lista de excecoes */
        if (!execoes.includes(getNomeParticipante(participante))) {
            desligarVideoParticipante(participante);
        }
    });
}

/* FUNCOES AVANCADAS */

function focarNoDirigente() {
    abrirPainelParticipantes();
    const dirigente = selecionarParticipante(identificacaoDirigente);
    const presidente = selecionarParticipante(identificacaoPresidente);
    const leitor = selecionarParticipante(identificacaoLeitor);

    if (!dirigente) {
        return alert(`Dirigente não informado.\nCom permissão de anfitrião (host) identifique-o renomeando.\nExemplo: Anthony Morris - ${identificacaoDirigente}`);
    }

    /* desligar video de todos participantes, exceto dirigente, leitor e presidente */
    desligarVideos([dirigente, leitor, presidente]);

    /* silenciar todos exceto dirigente e leitor */
    desligarMicrofones([dirigente, leitor]);

    /* ligar video do dirigente */
    ligarVideoParticipante(dirigente, () => {
        const dirigente = selecionarParticipante(identificacaoDirigente);
        /* quando o dirigente iniciar seu video */
        spotlightParticipante(dirigente);
        ligarMicrofoneParticipante(dirigente, true);
        /* para evitar distracoes com autofoco, manter o presidente em foco ate que dirigente inicie seu video */
        desligarVideoParticipante(selecionarParticipante(identificacaoPresidente));
    });
}

function focarNoLeitor() {
    abrirPainelParticipantes();
    const leitor = selecionarParticipante(identificacaoLeitor);
    const dirigente = selecionarParticipante(identificacaoDirigente);

    if (!leitor) {
        return alert(`Leitor não informado.\nCom permissão de anfitrião (host) identifique-o renomeando.\nExemplo: David Splane - ${identificacaoLeitor}`);
    }

    /* desligar video de todos participantes, exceto dirigente e leitor */
    desligarVideos([dirigente, leitor]);

    /* silenciar todos participantes, exceto leitor e dirigente */
    desligarMicrofones([leitor, dirigente]);

    /* ligar video do leitor */
    ligarVideoParticipante(leitor, () => {
        /* quando o leitor iniciar seu video */
        spotlightParticipante(leitor);
        ligarMicrofoneParticipante(leitor, true);
    });
}

function focarNoPresidente() {
    abrirPainelParticipantes();
    const presidente = selecionarParticipante(identificacaoPresidente);

    if (!presidente) {
        return alert(`Presidente não informado.\nCom permissão de anfitrião (host) identifique-o renomeando.\nExemplo: Geoffrey Jackson - ${identificacaoPresidente}`);
    }

    /* silenciar todos participantes, exceto presidente */
    desligarMicrofones([presidente]);

    /* ligar video do presidente */
    ligarVideoParticipante(presidente, () => {
        /* quando o presidente iniciar seu video */
        ligarMicrofoneParticipante(presidente, true);
        spotlightParticipante(presidente);
        desligarVideos([presidente]); /* exceto presidente */
    });
}

function focarNoOrador() {
    abrirPainelParticipantes();
    const orador = selecionarParticipante(identificacaoOrador);

    if (!orador) {
        return alert(`Orador não informado.\nCom permissão de anfitrião (host) identifique-o renomeando.\nExemplo: Gerrit Losch - ${identificacaoOrador}`);
    }

    /* desligar video de todos participantes, exceto orador */
    desligarVideos([orador]);

    /* silenciar todos participantes, exceto orador */
    desligarMicrofones([orador]);

    /* ligar video do orador */
    ligarVideoParticipante(orador, () => {
        /* quando o orador iniciar seu video */
        spotlightParticipante(orador);
        ligarMicrofoneParticipante(orador, true);
    });
}

function criarFocoCustomizado() {
    abrirPainelParticipantes();
    let texto = prompt('Informe como (nome ou palavra no nome) encontrar o participante.\n\n(Dica: use uma identificação diferente em cada participante)');
    texto = texto.trim().toLocaleLowerCase();
    if (!texto) return alert('Nome não informado. Nenhuma ação será tomada. Tente novamente');

    const alvo = selecionarParticipante(texto);
    if (!alvo) return alert('Não encontrado! Experimente outras palavras');

    const confirmar = confirm(`Participante encontrado: ${getNomeParticipante(alvo)}\n\nDeseja criar um novo botão para focar neste participante?`);
    if (!confirmar) return;

    const nomeParticipante = getNomeParticipante(alvo);
    const btn = {
        id: btoa(nomeParticipante),
        alvo: nomeParticipante,
        click: () => {
            if (!confirm(`Tem certeza que desejar pôr ${nomeParticipante.toUpperCase()} em foco?`)) {
                return;
            }
            /* silenciar todos participantes, exceto participante informado */
            desligarMicrofones([alvo]);

            /* ligar video do participante informado */
            ligarVideoParticipante(alvo, () => {
                /* quando o participante informado iniciar seu video */
                desligarVideos([alvo]);
                spotlightParticipante(alvo);
                ligarMicrofoneParticipante(alvo, true);
            });
        }
    };

    /* adicionar botao novo, sempre removendo as repeticoes */
    const botoes = avisosDeRotinas['botoesFocoCustomizado'].filter(bfc => bfc.alvo != btn.alvo);
    botoes.push(btn);

    avisosDeRotinas['botoesFocoCustomizado'] = botoes;
    atualizarTela();
}

function excluirBotaoFocoCustomizado(id) {
    if (id) {
        avisosDeRotinas['botoesFocoCustomizado'] = avisosDeRotinas['botoesFocoCustomizado'].filter(bfc => bfc.id != id);
        atualizarBotoesFocoCustomizado();
    }
}

function liberarPalmas() {
    abrirPainelParticipantes();
    /* ligar microfone de todos participantes para as palmas */
    ligarMicrofones();
    document.querySelector('.btn-palmas').classList.add('disabled');
    setTimeout(() => {
        desligarMicrofones();
        document.querySelector('.btn-palmas').classList.remove('disabled');
        atualizarTela();
    }, tempoDePalmas);
}

function finalizarDiscurso() {
    abrirPainelParticipantes();
    const presidente = selecionarParticipante(identificacaoPresidente);

    /* desligar video de todos participantes */
    desligarVideos();

    /* ligar microfone de todos participantes para as palmas */
    ligarMicrofones();

    /* desativar botoes durante as palmas para evitar interrupcoes acidentais */
    document.querySelectorAll('.btn-funcionalidade').forEach(btn => btn.classList.add('disabled'));

    /* Aguardar tempo suficiente de palmas (8 segundos) */
    setTimeout(() => {
        desligarMicrofones();
        document.querySelectorAll('.btn-funcionalidade').forEach(btn => btn.classList.remove('disabled'));
        atualizarTela();
    }, tempoDePalmas);

    /* ligar video do presidente antes de acabar as palmas */
    setTimeout(() => ligarVideoParticipante(presidente, () => {
        /* quando o presidente iniciar seu video */
        spotlightParticipante(presidente);
        ligarMicrofoneParticipante(presidente, true);
    }), tempoDePalmas / 2);

    atualizarTela();
}

function desligarTudo() {
    abrirPainelParticipantes();
    desligarVideos();
    desligarMicrofones();
}

function ligarTudo() {
    abrirPainelParticipantes();
    getParticipantes().forEach(participante => ligarVideoParticipante(participante));
    ligarMicrofones();
    desligarSpotlight(); /* deixar foco automático */
}

function contarAssistencia() {
    abrirPainelParticipantes();
    let assistencia = 0;
    const nomesForaPadrao = [];

    getParticipantes().forEach(participante => {
        const nome = getNomeParticipante(participante);

        if (!isNomeValido(participante)) {
            nomesForaPadrao.push(nome);
            return;
        }

        const quantidade = parseInt(nome.replace(/\(|\{|\[/, '').trim());
        if (quantidade > 0) {
            assistencia += quantidade;
        }
    });

    return {
        contados: assistencia,
        naoContados: nomesForaPadrao.length,
        nomesInvalidos: nomesForaPadrao
    };
}

/* INICIO DO SCRIPT */
var idTextoContados = 'texto-contados';
var idTextoNaoContados = 'texto-nao-contados';
var idModal = 'opcoes-reuniao';
var tempoDePalmas = 8000;

/* PALAVRAS-CHAVE PARA ENCONTRAR PARTICIPANTES (NOMEAR PARTICIPANTE COM CHAVES ABAIXO) */
var identificacaoDirigente = 'dirigente';
var identificacaoPresidente = 'presidente';
var identificacaoLeitor = 'leitor';
var identificacaoOrador = 'orador';

var textoPararVideo = ['stop video', 'parar vídeo'];
var textoCancelarSpotlight = ['cancel the spotlight video', 'cancelar vídeo de destaque'];
var textoLigarMicrofone = ['ask to unmute', 'pedir para ativar som', 'unmute', 'ativar som'];
var textoDesligarMicrofone = ['mute', 'desativar som'];

var intervalosEmExecucao = intervalosEmExecucao || {};
var cache = {};
var avisosDeRotinas = {
    tentativasPersistentes: [],
    validarVideosLigadosNaAssistencia: [],
    validarNomesForaDoPadrao: [],
    registrarEntradaNaSalaComNomeInvalido: [],
    botoesFocoCustomizado: avisosDeRotinas ? avisosDeRotinas['botoesFocoCustomizado'] : [],
};

/* RESPONSAVEL POR OUVIR MUDANCAS NO PAINEL DOS PARTICIPANTES */
var observer = observer || null;

criarCss();
desenharModal();
criarBotaoOpcoesCustomizadas();
iniciarEventosPainelParticipantes();

/* TODO:
    opcao renomear invalidos na assistencia
*/