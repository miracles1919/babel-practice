import _intl from 'intl';
import React from 'react';
import { Button, Space } from 'components';
import { DemoBlock } from 'demos';
import { SearchOutline } from 'icons';
export default (() => {
  // 注释a
  const a = _intl.t('intl1');

  const b = `${_intl.t('intl2')}`; // 注释b

  const abc = `${a}${b}${_intl.t('intl1')}`;
  return <>
      <DemoBlock title={_intl.t('intl1')}>
        <Button>
          <Space>
            <SearchOutline />
            <span>搜索</span>
          </Space>
        </Button>
      </DemoBlock>

      <DemoBlock title={_intl.t('intl2')}>
        <Space wrap>
          <Button disabled>Disabled</Button>
          <Button disabled color='primary'>
            Disabled
          </Button>
        </Space>
      </DemoBlock>

      <DemoBlock title={`${loadingTitle}${_intl.t('intl3')}`}>
        <Space wrap>
          <Button loading color={_intl.t('intl4')} loadingText={_intl.t('intl5')}>
            Loading
          </Button>
          <Button loading>Loading</Button>
        </Space>
      </DemoBlock>
    </>;
});