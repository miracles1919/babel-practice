import React from 'react';
import { Button, Space } from 'components';
import { DemoBlock } from 'demos';
import { SearchOutline } from 'icons';


export default () => {
  // 注释a
  const a = '带图标的按钮'
  const b = `禁用状态` // 注释b
  const abc = `${a}${b}带图标的按钮`

  return (
    <>
      <DemoBlock title='带图标的按钮'>
        <Button>
          <Space>
            <SearchOutline />
            <span>搜索</span>
          </Space>
        </Button>
      </DemoBlock>

      <DemoBlock title='禁用状态'>
        <Space wrap>
          <Button disabled>Disabled</Button>
          <Button disabled color=/*i18n-disable*/'primary'>
            Disabled
          </Button>
        </Space>
      </DemoBlock>

      <DemoBlock title={`${loadingTitle}状态`}>
        <Space wrap>
          <Button loading color='primary' loadingText='正在加载'>
            Loading
          </Button>
          <Button loading>Loading</Button>
        </Space>
      </DemoBlock>
    </>
  );
};
