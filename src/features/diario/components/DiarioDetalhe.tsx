import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Image as ImageIcon, Package, PauseCircle, Users, Wrench } from 'lucide-react';
import { CabecalhoDiario } from './CabecalhoDiario';
import { EquipeTab } from './EquipeTab';
import { AtividadesTab } from './AtividadesTab';
import { MateriaisTab } from './MateriaisTab';
import { OcorrenciasTab } from './OcorrenciasTab';
import { ParalisacoesTab } from './ParalisacoesTab';
import { GaleriaImagens } from './GaleriaImagens';
import type { DiarioMutations } from '../hooks/useDiarioMutations';
import type { CronogramaAtividadeOption, DiarioDetalhado, DiarioFormValues } from '../types';

interface Props {
  diario: DiarioDetalhado;
  cronogramaAtividades: CronogramaAtividadeOption[];
  canEdit: boolean;
  canEditDelete: boolean;
  editMode: boolean;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onSaveCabecalho: (values: DiarioFormValues) => void;
  m: DiarioMutations;
}

export function DiarioDetalhe({
  diario, cronogramaAtividades, canEdit, canEditDelete,
  editMode, onEnterEdit, onCancelEdit, onSaveCabecalho, m,
}: Props) {
  return (
    <div className={`space-y-4 ${editMode ? 'ring-2 ring-accent rounded-lg p-3' : ''}`}>
      <CabecalhoDiario
        diario={diario}
        editMode={editMode}
        canEditDelete={canEditDelete}
        onEnterEdit={onEnterEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSaveCabecalho}
      />

      <Tabs defaultValue="equipe">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="equipe" className="text-xs"><Users className="h-3 w-3 mr-1" />Equipe</TabsTrigger>
          <TabsTrigger value="atividades" className="text-xs"><Wrench className="h-3 w-3 mr-1" />Atividades</TabsTrigger>
          <TabsTrigger value="materiais" className="text-xs"><Package className="h-3 w-3 mr-1" />Materiais</TabsTrigger>
          <TabsTrigger value="ocorrencias" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Ocorrências</TabsTrigger>
          <TabsTrigger value="imagens" className="text-xs"><ImageIcon className="h-3 w-3 mr-1" />Imagens</TabsTrigger>
          <TabsTrigger value="paralisacoes" className="text-xs"><PauseCircle className="h-3 w-3 mr-1" />Paral.</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <EquipeTab
            equipe={diario.diario_equipe}
            canEdit={canEdit || editMode}
            canEditDelete={canEditDelete}
            onAdd={(v) => m.adicionarEquipe.mutate(v)}
            onUpdate={(v) => m.atualizarEquipe.mutate(v)}
            onDelete={(id) => m.excluirEquipe.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="atividades">
          <AtividadesTab
            atividades={diario.diario_atividades}
            cronogramaAtividades={cronogramaAtividades}
            canEdit={canEdit}
            onAdd={(v) => m.adicionarAtividade.mutate(v)}
            onUpdate={(v) => m.atualizarAtividade.mutate(v)}
            onDelete={(id) => m.excluirAtividade.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="materiais">
          <MateriaisTab
            materiais={diario.diario_materiais}
            canEdit={canEdit}
            canEditDelete={canEditDelete}
            onAdd={(v) => m.adicionarMaterial.mutate(v)}
            onUpdate={(v) => m.atualizarMaterial.mutate(v)}
            onDelete={(id) => m.excluirMaterial.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="ocorrencias">
          <OcorrenciasTab
            ocorrencias={diario.diario_ocorrencias}
            canEdit={canEdit}
            canEditDelete={canEditDelete}
            onAdd={(v) => m.adicionarOcorrencia.mutate(v)}
            onUpdate={(v) => m.atualizarOcorrencia.mutate(v)}
            onDelete={(id) => m.excluirOcorrencia.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="imagens">
          <GaleriaImagens
            imagens={diario.diario_imagens}
            canEdit={canEdit}
            canEditDelete={canEditDelete}
            onUpload={(v) => m.enviarImagem.mutate(v)}
            onUpdateLegenda={(v) => m.atualizarLegendaImagem.mutate(v)}
            onDelete={(id) => m.excluirImagem.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="paralisacoes">
          <ParalisacoesTab
            paralisacoes={diario.diario_paralisacoes}
            canEdit={canEdit}
            canEditDelete={canEditDelete}
            onAdd={(v) => m.adicionarParalisacao.mutate(v)}
            onUpdate={(v) => m.atualizarParalisacao.mutate(v)}
            onDelete={(id) => m.excluirParalisacao.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
